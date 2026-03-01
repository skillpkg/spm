import { readFile } from 'node:fs/promises';
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
    const emailMatch = /[\w.-]+@[\w.-]+\.\w+/.exec(decoded);
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
