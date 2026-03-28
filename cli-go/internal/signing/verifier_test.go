package signing

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Helper to create a valid bundle for test data ---

func createTestBundle(t *testing.T, data []byte, identity string) []byte {
	t.Helper()
	digest := sha256.Sum256(data)
	digestB64 := base64.StdEncoding.EncodeToString(digest[:])

	// Create a cert-like blob with an email embedded
	certContent := []byte("CERTIFICATE for " + identity)
	certB64 := base64.StdEncoding.EncodeToString(certContent)

	bundle := SigstoreBundle{
		MediaType: "application/vnd.dev.sigstore.bundle.v0.3+json",
		VerificationMaterial: &VerificationMaterial{
			Certificate: &Certificate{
				RawBytes: certB64,
			},
			TlogEntries: []TlogEntry{
				{LogIndex: "1", IntegratedTime: "1700000000"},
			},
		},
		MessageSignature: &MessageSignature{
			MessageDigest: &MessageDigest{
				Algorithm: "SHA2_256",
				Digest:    digestB64,
			},
			Signature: base64.StdEncoding.EncodeToString([]byte("fake-signature")),
		},
	}

	bundleJSON, err := json.Marshal(bundle)
	require.NoError(t, err)
	return bundleJSON
}

func createTestBundleV01(t *testing.T, data []byte, identity string) []byte {
	t.Helper()
	digest := sha256.Sum256(data)
	digestB64 := base64.StdEncoding.EncodeToString(digest[:])

	certContent := []byte("CERTIFICATE for " + identity)
	certB64 := base64.StdEncoding.EncodeToString(certContent)

	bundle := SigstoreBundle{
		MediaType: "application/vnd.dev.sigstore.bundle+json;version=0.1",
		VerificationMaterial: &VerificationMaterial{
			X509CertificateChain: &X509CertificateChain{
				Certificates: []Certificate{
					{RawBytes: certB64},
				},
			},
			TlogEntries: []TlogEntry{
				{LogIndex: "1"},
			},
		},
		MessageSignature: &MessageSignature{
			MessageDigest: &MessageDigest{
				Algorithm: "SHA2_256",
				Digest:    digestB64,
			},
			Signature: base64.StdEncoding.EncodeToString([]byte("fake-signature")),
		},
	}

	bundleJSON, err := json.Marshal(bundle)
	require.NoError(t, err)
	return bundleJSON
}

// --- DefaultVerifier Tests ---

func TestDefaultVerifier_ValidBundle(t *testing.T) {
	data := []byte("hello world")
	bundleJSON := createTestBundle(t, data, "user@example.com")

	v := &DefaultVerifier{}
	result, err := v.Verify(data, bundleJSON)
	require.NoError(t, err)
	assert.True(t, result.Verified)
	assert.Equal(t, "user@example.com", result.SignerIdentity)
}

func TestDefaultVerifier_TamperedContent(t *testing.T) {
	original := []byte("original content")
	bundleJSON := createTestBundle(t, original, "user@example.com")

	// Verify with different data
	tampered := []byte("tampered content")
	v := &DefaultVerifier{}
	result, err := v.Verify(tampered, bundleJSON)
	require.NoError(t, err)
	assert.False(t, result.Verified)
	assert.Contains(t, result.Error, "digest mismatch")
}

func TestDefaultVerifier_InvalidBundleJSON(t *testing.T) {
	v := &DefaultVerifier{}
	result, err := v.Verify([]byte("data"), []byte("not json"))
	require.NoError(t, err)
	assert.False(t, result.Verified)
	assert.Contains(t, result.Error, "invalid sigstore bundle")
}

func TestDefaultVerifier_MissingMessageSignature(t *testing.T) {
	bundle := `{
		"mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json",
		"verificationMaterial": {"certificate": {"rawBytes": "dGVzdA=="}}
	}`
	v := &DefaultVerifier{}
	result, err := v.Verify([]byte("data"), []byte(bundle))
	require.NoError(t, err)
	assert.False(t, result.Verified)
	assert.Contains(t, result.Error, "missing messageSignature")
}

func TestDefaultVerifier_MissingMessageDigest(t *testing.T) {
	bundle := `{
		"mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json",
		"verificationMaterial": {"certificate": {"rawBytes": "dGVzdA=="}},
		"messageSignature": {"signature": "c2ln"}
	}`
	v := &DefaultVerifier{}
	result, err := v.Verify([]byte("data"), []byte(bundle))
	require.NoError(t, err)
	assert.False(t, result.Verified)
	assert.Contains(t, result.Error, "missing messageDigest")
}

// --- Bundle Format Version Tests ---

func TestDefaultVerifier_V01Bundle(t *testing.T) {
	data := []byte("v0.1 test data")
	bundleJSON := createTestBundleV01(t, data, "v01@example.com")

	v := &DefaultVerifier{}
	result, err := v.Verify(data, bundleJSON)
	require.NoError(t, err)
	assert.True(t, result.Verified)
	assert.Equal(t, "v01@example.com", result.SignerIdentity)
}

func TestDetectBundleVersion(t *testing.T) {
	tests := []struct {
		name     string
		json     string
		expected string
	}{
		{
			name:     "v0.3 bundle",
			json:     `{"mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json"}`,
			expected: "v0.3",
		},
		{
			name:     "v0.2 bundle",
			json:     `{"mediaType": "application/vnd.dev.sigstore.bundle.v0.2+json"}`,
			expected: "v0.2",
		},
		{
			name:     "v0.1 bundle",
			json:     `{"mediaType": "application/vnd.dev.sigstore.bundle+json;version=0.1"}`,
			expected: "v0.1",
		},
		{
			name:     "sigstore without version",
			json:     `{"mediaType": "application/vnd.dev.sigstore.bundle+json"}`,
			expected: "v0.1",
		},
		{
			name:     "unknown media type",
			json:     `{"mediaType": "application/json"}`,
			expected: "unknown",
		},
		{
			name:     "invalid JSON",
			json:     "not json",
			expected: "unknown",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := DetectBundleVersion([]byte(tc.json))
			assert.Equal(t, tc.expected, result)
		})
	}
}

// --- Identity Extraction Tests ---

func TestExtractSignerIdentity_V03Certificate(t *testing.T) {
	certContent := []byte("CERTIFICATE for user@example.com issued by Fulcio")
	certB64 := base64.StdEncoding.EncodeToString(certContent)

	bundle := &SigstoreBundle{
		VerificationMaterial: &VerificationMaterial{
			Certificate: &Certificate{RawBytes: certB64},
		},
	}

	identity := extractSignerIdentity(bundle)
	assert.Equal(t, "user@example.com", identity)
}

func TestExtractSignerIdentity_V01CertChain(t *testing.T) {
	certContent := []byte("CERTIFICATE for dev@example.org")
	certB64 := base64.StdEncoding.EncodeToString(certContent)

	bundle := &SigstoreBundle{
		VerificationMaterial: &VerificationMaterial{
			X509CertificateChain: &X509CertificateChain{
				Certificates: []Certificate{{RawBytes: certB64}},
			},
		},
	}

	identity := extractSignerIdentity(bundle)
	assert.Equal(t, "dev@example.org", identity)
}

func TestExtractSignerIdentity_GitHubActionsURI(t *testing.T) {
	certContent := []byte("CERTIFICATE for https://github.com/skillpkg/spm/.github/workflows/release.yml")
	certB64 := base64.StdEncoding.EncodeToString(certContent)

	bundle := &SigstoreBundle{
		VerificationMaterial: &VerificationMaterial{
			Certificate: &Certificate{RawBytes: certB64},
		},
	}

	identity := extractSignerIdentity(bundle)
	assert.Contains(t, identity, "github.com/skillpkg/spm")
}

func TestExtractSignerIdentity_NoCertificate(t *testing.T) {
	bundle := &SigstoreBundle{
		VerificationMaterial: &VerificationMaterial{},
	}

	identity := extractSignerIdentity(bundle)
	assert.Equal(t, "unknown", identity)
}

func TestExtractSignerIdentity_NilVerificationMaterial(t *testing.T) {
	bundle := &SigstoreBundle{}
	identity := extractSignerIdentity(bundle)
	assert.Equal(t, "unknown", identity)
}

func TestExtractSignerIdentity_EmptyCertChain(t *testing.T) {
	bundle := &SigstoreBundle{
		VerificationMaterial: &VerificationMaterial{
			X509CertificateChain: &X509CertificateChain{
				Certificates: []Certificate{},
			},
		},
	}

	identity := extractSignerIdentity(bundle)
	assert.Equal(t, "unknown", identity)
}

// --- ExtractIdentity (public convenience function) Tests ---

func TestExtractIdentity_ValidBundle(t *testing.T) {
	certContent := []byte("cert for user@test.com")
	certB64 := base64.StdEncoding.EncodeToString(certContent)

	bundleJSON, _ := json.Marshal(SigstoreBundle{
		MediaType: "application/vnd.dev.sigstore.bundle.v0.3+json",
		VerificationMaterial: &VerificationMaterial{
			Certificate: &Certificate{RawBytes: certB64},
		},
	})

	identity := ExtractIdentity(bundleJSON)
	assert.Equal(t, "user@test.com", identity)
}

func TestExtractIdentity_InvalidBundle(t *testing.T) {
	identity := ExtractIdentity([]byte("not json"))
	assert.Equal(t, "unknown", identity)
}

// --- VerifyBundle convenience function Tests ---

func TestVerifyBundle_Valid(t *testing.T) {
	data := []byte("test content")
	bundleJSON := createTestBundle(t, data, "signer@example.com")

	result, err := VerifyBundle(data, bundleJSON)
	require.NoError(t, err)
	assert.True(t, result.Verified)
	assert.Equal(t, "signer@example.com", result.SignerIdentity)
}

func TestVerifyBundle_Tampered(t *testing.T) {
	original := []byte("original")
	bundleJSON := createTestBundle(t, original, "signer@example.com")

	result, err := VerifyBundle([]byte("modified"), bundleJSON)
	require.NoError(t, err)
	assert.False(t, result.Verified)
}

// --- Mock Verifier Tests ---

type mockVerifier struct {
	result *VerifyResult
	err    error
}

func (m *mockVerifier) Verify(data []byte, bundleJSON []byte) (*VerifyResult, error) {
	return m.result, m.err
}

func TestMockVerifier_Interface(t *testing.T) {
	var v Verifier = &mockVerifier{
		result: &VerifyResult{Verified: true, SignerIdentity: "mock@test.com"},
	}

	result, err := v.Verify([]byte("data"), []byte("bundle"))
	require.NoError(t, err)
	assert.True(t, result.Verified)
	assert.Equal(t, "mock@test.com", result.SignerIdentity)
}

// --- Test Fixture Tests ---

func TestFixture_ValidBundle(t *testing.T) {
	fixtureDir := filepath.Join("..", "..", "testdata", "bundles")
	bundleJSON, err := os.ReadFile(filepath.Join(fixtureDir, "valid-bundle.json"))
	require.NoError(t, err)

	bundle, err := ParseBundle(bundleJSON)
	require.NoError(t, err)
	assert.Contains(t, bundle.MediaType, "sigstore")
	assert.NotNil(t, bundle.VerificationMaterial)
}

func TestFixture_InvalidBundle(t *testing.T) {
	fixtureDir := filepath.Join("..", "..", "testdata", "bundles")
	bundleJSON, err := os.ReadFile(filepath.Join(fixtureDir, "invalid-bundle.json"))
	require.NoError(t, err)

	_, err = ParseBundle(bundleJSON)
	assert.Error(t, err)
}

// --- extractSANFromCertBytes Tests ---

func TestExtractSANFromCertBytes_Email(t *testing.T) {
	certContent := []byte("Subject: CN=user@example.com")
	certB64 := base64.StdEncoding.EncodeToString(certContent)
	assert.Equal(t, "user@example.com", extractSANFromCertBytes(certB64))
}

func TestExtractSANFromCertBytes_GitHubURI(t *testing.T) {
	certContent := []byte("SAN: https://github.com/org/repo/.github/workflows/ci.yml")
	certB64 := base64.StdEncoding.EncodeToString(certContent)
	result := extractSANFromCertBytes(certB64)
	assert.Contains(t, result, "github.com/org/repo")
}

func TestExtractSANFromCertBytes_InvalidBase64(t *testing.T) {
	assert.Equal(t, "unknown", extractSANFromCertBytes("!!!not-base64!!!"))
}

func TestExtractSANFromCertBytes_NoIdentity(t *testing.T) {
	certContent := []byte("just some random cert bytes with no identity info")
	certB64 := base64.StdEncoding.EncodeToString(certContent)
	assert.Equal(t, "unknown", extractSANFromCertBytes(certB64))
}
