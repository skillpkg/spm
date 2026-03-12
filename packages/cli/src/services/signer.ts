import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { bundleToJSON } from '@sigstore/bundle';
import type { SerializedBundle } from '@sigstore/bundle';

export interface SignResult {
  bundle: string; // JSON-serialized sigstore bundle
  signerIdentity: string; // e.g., "almog@github"
}

/**
 * Extract the signer identity from a serialized Sigstore bundle.
 * Looks in the certificate chain for email/URI patterns (SAN field).
 */
const extractSignerIdentity = (serialized: SerializedBundle): string => {
  try {
    const vm = serialized.verificationMaterial;
    let certB64: string | undefined;

    // v0.3 bundles use a single "certificate" field
    if ('certificate' in vm && vm.certificate) {
      certB64 = vm.certificate.rawBytes;
    }

    // v0.1/v0.2 bundles use "x509CertificateChain"
    if (!certB64 && 'x509CertificateChain' in vm && vm.x509CertificateChain) {
      const certs = vm.x509CertificateChain.certificates;
      if (certs.length > 0) {
        certB64 = certs[0].rawBytes;
      }
    }

    if (certB64) {
      return extractSANFromCertBytes(certB64);
    }
  } catch {
    // Fall through to unknown
  }
  return 'unknown';
};

/**
 * Extract Subject Alternative Name from base64-encoded DER certificate bytes.
 * This is a simplified extraction — looks for common email/URI patterns.
 */
const extractSANFromCertBytes = (certB64: string): string => {
  try {
    const decoded = Buffer.from(certB64, 'base64').toString('utf-8');
    // Look for email-like patterns in the cert
    const emailMatch = /[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/.exec(decoded);
    if (emailMatch) {
      return emailMatch[0];
    }
    // Look for URI patterns (GitHub Actions identity)
    const uriMatch = /https:\/\/github\.com\/[\w./-]+/.exec(decoded);
    if (uriMatch) {
      return uriMatch[0];
    }
  } catch {
    // Fall through
  }
  return 'unknown';
};

/**
 * Sign a .skl package file using Sigstore keyless signing.
 *
 * Uses Fulcio for ephemeral certificate issuance and Rekor for
 * transparency log recording. Requires an OIDC identity token
 * (from CI environment or interactive browser flow).
 *
 * Returns null if signing fails — signing should never block publish.
 */
export const signPackage = async (packagePath: string): Promise<SignResult | null> => {
  try {
    // Read the package file
    const fileBuffer = await readFile(packagePath);

    // Dynamically import sigstore modules to avoid issues if not available
    const { MessageSignatureBundleBuilder, FulcioSigner, RekorWitness, CIContextProvider } =
      await import('@sigstore/sign');

    // Use CIContextProvider which auto-detects CI environments
    // (GitHub Actions, GitLab CI, etc.) and falls back gracefully
    const identityProvider = new CIContextProvider();

    const signer = new FulcioSigner({
      identityProvider,
    });

    const witness = new RekorWitness({});

    const bundleBuilder = new MessageSignatureBundleBuilder({
      signer,
      witnesses: [witness],
    });

    // Create the signed bundle
    const bundle = await bundleBuilder.create({
      data: fileBuffer,
    });

    // Serialize the bundle to JSON
    const serialized = bundleToJSON(bundle);
    const bundleJson = JSON.stringify(serialized);

    // Extract signer identity from the serialized certificate
    const signerIdentity = extractSignerIdentity(serialized);

    return {
      bundle: bundleJson,
      signerIdentity,
    };
  } catch {
    // Signing failure should never block publish
    return null;
  }
};

/**
 * Sign a .skl package file using Sigstore with interactive browser-based OIDC.
 *
 * Opens the user's browser for OAuth authentication (Fulcio + Rekor).
 * Intended for local (non-CI) use when the --sign flag is provided.
 *
 * Returns null if signing fails — signing should never block publish.
 */
export const signPackageInteractive = async (packagePath: string): Promise<SignResult | null> => {
  try {
    const fileBuffer = await readFile(packagePath);

    const { sign } = await import('sigstore');

    const bundle = await sign(fileBuffer);

    // sigstore.sign() returns a SerializedBundle (JSON-ready object)
    // which is structurally identical to what bundleToJSON() produces
    const serialized = bundle as unknown as SerializedBundle;
    const bundleJson = JSON.stringify(serialized);
    const signerIdentity = extractSignerIdentity(serialized);

    return {
      bundle: bundleJson,
      signerIdentity,
    };
  } catch {
    // Signing failure should never block publish
    return null;
  }
};

// ── Batch signing with single OAuth authentication ──

const SIGSTORE_OAUTH_ISSUER = 'https://oauth2.sigstore.dev/auth';

/**
 * Perform Sigstore OAuth PKCE flow to obtain an OIDC identity token.
 * Opens the browser once for authentication and returns the id_token.
 */
const getOIDCTokenInteractive = async (): Promise<string> => {
  const { default: open } = await import('open');

  // Generate PKCE code verifier and challenge
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  const nonce = randomBytes(16).toString('hex');
  const state = randomBytes(16).toString('hex');

  return new Promise<string>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost`);

        if (url.pathname !== '/callback') {
          res.writeHead(404);
          res.end();
          return;
        }

        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (!code || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body><h3>Authentication failed.</h3><p>You can close this tab.</p></body></html>',
          );
          server.close();
          reject(new Error('OAuth callback missing code or state mismatch'));
          return;
        }

        // Exchange authorization code for tokens
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const redirectUri = `http://localhost:${port}/callback`;

        const tokenRes = await fetch(`${SIGSTORE_OAUTH_ISSUER}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: 'sigstore',
            code_verifier: codeVerifier,
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body><h3>Token exchange failed.</h3><p>You can close this tab.</p></body></html>',
          );
          server.close();
          reject(new Error(`Token exchange failed: ${errText}`));
          return;
        }

        const tokenData = (await tokenRes.json()) as { id_token?: string };
        const idToken = tokenData.id_token;

        if (!idToken) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body><h3>No id_token received.</h3><p>You can close this tab.</p></body></html>',
          );
          server.close();
          reject(new Error('No id_token in token response'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><h3>Authenticated!</h3><p>You can close this tab.</p></body></html>');
        server.close();
        resolve(idToken);
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth authentication timed out'));
    }, 120_000);

    server.on('close', () => clearTimeout(timeout));

    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const redirectUri = `http://localhost:${port}/callback`;

      const authUrl =
        `${SIGSTORE_OAUTH_ISSUER}/auth?` +
        new URLSearchParams({
          client_id: 'sigstore',
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid email',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          nonce,
          state,
        }).toString();

      open(authUrl).catch(() => {
        // If open fails, user will need to copy the URL
      });
    });
  });
};

/**
 * Create a batch signer that authenticates once via browser OAuth
 * and reuses the OIDC token for multiple package signatures.
 *
 * Returns a sign function that can be called for each package.
 */
export const createBatchSigner = async (): Promise<{
  sign: (packagePath: string) => Promise<SignResult>;
  identity: string;
}> => {
  const isCI = !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI);

  if (isCI) {
    // In CI, each sign uses CIContextProvider (no browser needed)
    return {
      sign: async (packagePath: string): Promise<SignResult> => {
        const result = await signPackage(packagePath);
        if (!result) throw new Error('CI signing failed');
        return result;
      },
      identity: 'CI',
    };
  }

  // Interactive: get OIDC token once via browser
  const identityToken = await getOIDCTokenInteractive();

  // Decode token to extract identity for display
  const [, payloadB64] = identityToken.split('.');
  let identity = 'unknown';
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString()) as {
      email?: string;
      sub?: string;
    };
    identity = payload.email ?? payload.sub ?? 'unknown';
  } catch {
    // best-effort
  }

  const { sign } = await import('sigstore');

  return {
    sign: async (packagePath: string): Promise<SignResult> => {
      const fileBuffer = await readFile(packagePath);
      const bundle = await sign(fileBuffer, { identityToken });
      const serialized = bundle as unknown as SerializedBundle;
      const bundleJson = JSON.stringify(serialized);
      const signerIdentity = extractSignerIdentity(serialized);

      return {
        bundle: bundleJson,
        signerIdentity: signerIdentity !== 'unknown' ? signerIdentity : identity,
      };
    },
    identity,
  };
};
