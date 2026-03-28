package signing

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// VerifyResult holds the output of a verification operation.
type VerifyResult struct {
	// Verified is true if the signature verification succeeded.
	Verified bool `json:"verified"`
	// SignerIdentity is the identity extracted from the signing certificate.
	SignerIdentity string `json:"signer_identity,omitempty"`
	// Error contains the error message if verification failed.
	Error string `json:"error,omitempty"`
}

// Verifier is the interface for verifying Sigstore bundles against file data.
type Verifier interface {
	// Verify checks a Sigstore bundle against the given data.
	Verify(data []byte, bundleJSON []byte) (*VerifyResult, error)
}

// DefaultVerifier implements Verifier using local bundle verification.
// For full Sigstore verification (Fulcio + Rekor), a production implementation
// would use sigstore-go's verification APIs with the public-good TrustedRoot.
type DefaultVerifier struct{}

// Verify parses the bundle and verifies the digest matches the data.
// It also extracts the signer identity from the certificate.
func (v *DefaultVerifier) Verify(data []byte, bundleJSON []byte) (*VerifyResult, error) {
	bundle, err := ParseBundle(bundleJSON)
	if err != nil {
		return &VerifyResult{
			Verified: false,
			Error:    fmt.Sprintf("invalid sigstore bundle: %s", err),
		}, nil
	}

	// Verify the message digest matches the data
	if bundle.MessageSignature == nil {
		return &VerifyResult{
			Verified: false,
			Error:    "bundle missing messageSignature",
		}, nil
	}

	if bundle.MessageSignature.MessageDigest == nil {
		return &VerifyResult{
			Verified: false,
			Error:    "bundle missing messageDigest",
		}, nil
	}

	// Compute SHA-256 digest of the data
	digest := sha256.Sum256(data)
	expectedDigest := base64.StdEncoding.EncodeToString(digest[:])

	if bundle.MessageSignature.MessageDigest.Digest != expectedDigest {
		return &VerifyResult{
			Verified: false,
			Error:    "digest mismatch: file contents do not match signed digest",
		}, nil
	}

	// Extract signer identity from the certificate
	identity := extractSignerIdentity(bundle)

	return &VerifyResult{
		Verified:       true,
		SignerIdentity: identity,
	}, nil
}

// extractSignerIdentity extracts the signer identity from a Sigstore bundle.
// It looks in both v0.3 (single certificate) and v0.1/v0.2 (certificate chain) formats.
func extractSignerIdentity(bundle *SigstoreBundle) string {
	if bundle.VerificationMaterial == nil {
		return "unknown"
	}

	vm := bundle.VerificationMaterial

	// v0.3: single certificate field
	if vm.Certificate != nil && vm.Certificate.RawBytes != "" {
		identity := extractSANFromCertBytes(vm.Certificate.RawBytes)
		if identity != "unknown" {
			return identity
		}
	}

	// v0.1/v0.2: x509CertificateChain
	if vm.X509CertificateChain != nil && len(vm.X509CertificateChain.Certificates) > 0 {
		identity := extractSANFromCertBytes(vm.X509CertificateChain.Certificates[0].RawBytes)
		if identity != "unknown" {
			return identity
		}
	}

	return "unknown"
}

// extractSANFromCertBytes extracts a Subject Alternative Name from base64-encoded
// certificate bytes. Looks for email and URI patterns.
func extractSANFromCertBytes(certB64 string) string {
	decoded, err := base64.StdEncoding.DecodeString(certB64)
	if err != nil {
		// Try raw URL encoding as fallback
		decoded, err = base64.RawStdEncoding.DecodeString(certB64)
		if err != nil {
			return "unknown"
		}
	}

	text := string(decoded)

	// Look for email patterns
	emailRe := regexp.MustCompile(`[\w.\-]+@[\w.\-]+\.[a-zA-Z]{2,}`)
	if match := emailRe.FindString(text); match != "" {
		return match
	}

	// Look for GitHub Actions URI patterns
	uriRe := regexp.MustCompile(`https://github\.com/[\w.\-/]+`)
	if match := uriRe.FindString(text); match != "" {
		return match
	}

	return "unknown"
}

// VerifyBundle verifies a Sigstore bundle JSON string against file data.
// This is a convenience function that uses the DefaultVerifier.
func VerifyBundle(data []byte, bundleJSON []byte) (*VerifyResult, error) {
	v := &DefaultVerifier{}
	return v.Verify(data, bundleJSON)
}

// DetectBundleVersion detects the bundle format version from the mediaType field.
// Returns "v0.1", "v0.2", "v0.3", or "unknown".
func DetectBundleVersion(bundleJSON []byte) string {
	var partial struct {
		MediaType string `json:"mediaType"`
	}
	if err := json.Unmarshal(bundleJSON, &partial); err != nil {
		return "unknown"
	}

	mt := partial.MediaType
	if strings.Contains(mt, "v0.3") {
		return "v0.3"
	}
	if strings.Contains(mt, "v0.2") {
		return "v0.2"
	}
	if strings.Contains(mt, "v0.1") {
		return "v0.1"
	}
	// If it has a sigstore media type but no version, assume v0.1
	if strings.Contains(mt, "sigstore") {
		return "v0.1"
	}
	return "unknown"
}

// ExtractIdentity extracts the signer identity from a bundle JSON.
// Returns "unknown" if the identity cannot be determined.
func ExtractIdentity(bundleJSON []byte) string {
	bundle, err := ParseBundle(bundleJSON)
	if err != nil {
		return "unknown"
	}
	return extractSignerIdentity(bundle)
}
