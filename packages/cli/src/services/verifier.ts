import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { bundleFromJSON } from '@sigstore/bundle';
import type { Bundle } from '@sigstore/bundle';

export interface VerifyResult {
  verified: boolean;
  signerIdentity?: string;
  error?: string;
}

/**
 * Fetch the Sigstore public-good TrustedRoot from the TUF repository.
 * Falls back to a direct fetch from the Sigstore TUF CDN.
 */
const fetchTrustedRoot = async (): Promise<unknown> => {
  const url = 'https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch trusted root: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

/**
 * Extract the signer identity from a verified Sigstore signer result.
 */
const extractIdentity = (signerResult: {
  identity?: { subjectAlternativeName?: string };
}): string => {
  return signerResult.identity?.subjectAlternativeName ?? 'unknown';
};

/**
 * Verify a .skl package against a Sigstore bundle.
 *
 * Parses the bundle, fetches the Sigstore TrustedRoot, and verifies
 * the signature against the package contents.
 *
 * Returns verified: true with signerIdentity on success, or
 * verified: false with an error message on failure.
 */
export const verifyPackage = async (
  packagePath: string,
  bundleJson: string,
): Promise<VerifyResult> => {
  try {
    // Parse the bundle
    const parsed: unknown = JSON.parse(bundleJson);
    let bundle: Bundle;
    try {
      bundle = bundleFromJSON(parsed);
    } catch (err) {
      return {
        verified: false,
        error: `Invalid sigstore bundle: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Read the package file
    const fileBuffer = await readFile(packagePath);

    // Compute hash for verification logging
    const _hash = createHash('sha256').update(fileBuffer).digest('hex');

    // Dynamically import verification modules
    const { Verifier, toTrustMaterial, toSignedEntity } = await import('@sigstore/verify');

    // Fetch the Sigstore public-good trusted root
    const trustedRootJson = await fetchTrustedRoot();

    // Import TrustedRoot message decoder from protobuf-specs
    const { TrustedRoot } = await import('@sigstore/protobuf-specs');
    const trustedRoot = TrustedRoot.fromJSON(trustedRootJson);

    // Build trust material from the trusted root
    const trustMaterial = toTrustMaterial(trustedRoot);

    // Create the verifier
    const verifier = new Verifier(trustMaterial);

    // Convert bundle to a signed entity for verification
    const signedEntity = toSignedEntity(bundle, fileBuffer);

    // Verify the signature
    const signerResult = verifier.verify(signedEntity);

    const signerIdentity = extractIdentity(signerResult);

    return {
      verified: true,
      signerIdentity,
    };
  } catch (err) {
    return {
      verified: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};
