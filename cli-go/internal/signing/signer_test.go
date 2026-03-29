package signing

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- CI Environment Detection Tests ---

func TestDetectCIEnv(t *testing.T) {
	tests := []struct {
		name     string
		envVars  map[string]string
		expected Env
	}{
		{
			name:     "GitHub Actions",
			envVars:  map[string]string{"GITHUB_ACTIONS": "true"},
			expected: EnvGitHubActions,
		},
		{
			name:     "GitLab CI",
			envVars:  map[string]string{"GITLAB_CI": "true"},
			expected: EnvGitLabCI,
		},
		{
			name:     "Generic CI",
			envVars:  map[string]string{"CI": "true"},
			expected: EnvGenericCI,
		},
		{
			name:     "No CI environment",
			envVars:  map[string]string{},
			expected: EnvUnknown,
		},
		{
			name:     "GitHub Actions takes priority over generic CI",
			envVars:  map[string]string{"GITHUB_ACTIONS": "true", "CI": "true"},
			expected: EnvGitHubActions,
		},
		{
			name:     "GitLab CI takes priority over generic CI",
			envVars:  map[string]string{"GITLAB_CI": "true", "CI": "true"},
			expected: EnvGitLabCI,
		},
		{
			name:     "CI=false is not detected",
			envVars:  map[string]string{"CI": "false"},
			expected: EnvUnknown,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Clear all CI env vars
			for _, key := range []string{"GITHUB_ACTIONS", "GITLAB_CI", "CI"} {
				t.Setenv(key, "")
				_ = os.Unsetenv(key)
			}
			// Set the test env vars
			for k, v := range tc.envVars {
				t.Setenv(k, v)
			}

			result := DetectCIEnv()
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestIsCI(t *testing.T) {
	t.Run("returns true in CI", func(t *testing.T) {
		t.Setenv("CI", "true")
		assert.True(t, IsCI())
	})

	t.Run("returns false outside CI", func(t *testing.T) {
		for _, key := range []string{"GITHUB_ACTIONS", "GITLAB_CI", "CI"} {
			t.Setenv(key, "")
			_ = os.Unsetenv(key)
		}
		assert.False(t, IsCI())
	})
}

func TestEnvString(t *testing.T) {
	assert.Equal(t, "GitHub Actions", EnvGitHubActions.String())
	assert.Equal(t, "GitLab CI", EnvGitLabCI.String())
	assert.Equal(t, "CI", EnvGenericCI.String())
	assert.Equal(t, "unknown", EnvUnknown.String())
}

// --- Mock Signer for testing ---

type mockSigner struct {
	result *SignResult
	err    error
}

func (m *mockSigner) Sign(data []byte) (*SignResult, error) {
	return m.result, m.err
}

// --- GracefulSigner Tests ---

func TestGracefulSigner_ReturnsNilOnError(t *testing.T) {
	inner := &mockSigner{
		result: nil,
		err:    fmt.Errorf("signing failed"),
	}
	graceful := &GracefulSigner{Inner: inner}

	result, err := graceful.Sign([]byte("test data"))
	assert.NoError(t, err)
	assert.Nil(t, result)
}

func TestGracefulSigner_PassesThroughSuccess(t *testing.T) {
	expected := &SignResult{
		Bundle:         `{"mediaType":"test"}`,
		SignerIdentity: "user@example.com",
	}
	inner := &mockSigner{result: expected, err: nil}
	graceful := &GracefulSigner{Inner: inner}

	result, err := graceful.Sign([]byte("test data"))
	assert.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestGracefulSigner_NeverPanics(t *testing.T) {
	// Even with a nil inner result and nil error, should not panic
	inner := &mockSigner{result: nil, err: nil}
	graceful := &GracefulSigner{Inner: inner}

	assert.NotPanics(t, func() {
		result, err := graceful.Sign([]byte("test"))
		assert.NoError(t, err)
		assert.Nil(t, result)
	})
}

// --- CISigner Tests ---

func TestCISigner_SignWithToken(t *testing.T) {
	// Create a mock JWT token
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"email":"ci@github.com","sub":"ci-user"}`))
	mockToken := header + "." + payload + ".signature"

	signer := &CISigner{
		OIDCTokenFn: func() (string, error) {
			return mockToken, nil
		},
	}

	result, err := signer.Sign([]byte("test data"))
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.NotEmpty(t, result.Bundle)
	assert.Equal(t, "ci@github.com", result.SignerIdentity)

	// Verify bundle is valid JSON
	var bundle SigstoreBundle
	err = json.Unmarshal([]byte(result.Bundle), &bundle)
	require.NoError(t, err)
	assert.Contains(t, bundle.MediaType, "sigstore")
}

func TestCISigner_FailsWithNoTokenProvider(t *testing.T) {
	signer := &CISigner{OIDCTokenFn: nil}

	result, err := signer.Sign([]byte("test data"))
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "no OIDC token provider")
}

func TestCISigner_FailsWhenTokenProviderErrors(t *testing.T) {
	signer := &CISigner{
		OIDCTokenFn: func() (string, error) {
			return "", fmt.Errorf("token fetch failed")
		},
	}

	result, err := signer.Sign([]byte("test data"))
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "token fetch failed")
}

// --- InteractiveSigner Tests ---

func TestInteractiveSigner_TimeoutWithNoCallback(t *testing.T) {
	signer := &InteractiveSigner{
		CallbackTimeout: 200 * time.Millisecond,
		OpenBrowserFn: func(url string) error {
			// Don't simulate a callback -- let it timeout
			return nil
		},
	}

	result, err := signer.Sign([]byte("test data"))
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "timed out")
}

func TestInteractiveSigner_Timeout(t *testing.T) {
	signer := &InteractiveSigner{
		CallbackTimeout: 100 * time.Millisecond,
		OpenBrowserFn: func(url string) error {
			// Don't do anything -- let it timeout
			return nil
		},
	}

	result, err := signer.Sign([]byte("test data"))
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "timed out")
}

func TestInteractiveSigner_BrowserOpenFails(t *testing.T) {
	signer := &InteractiveSigner{
		CallbackTimeout: 100 * time.Millisecond,
		OpenBrowserFn: func(url string) error {
			return fmt.Errorf("no browser available")
		},
	}

	result, err := signer.Sign([]byte("test data"))
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "failed to open browser")
}

// --- InteractiveSigner with real HTTP callback ---

func TestInteractiveSigner_SuccessfulCallback(t *testing.T) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"email":"user@example.com"}`))
	mockToken := header + "." + payload + ".sig"

	// We'll intercept the "browser open" to find the port and send the callback
	signer := &InteractiveSigner{
		CallbackTimeout: 5 * time.Second,
		OpenBrowserFn: func(authURL string) error {
			// Extract the redirect_uri from the auth URL to find the callback port
			go func() {
				time.Sleep(50 * time.Millisecond)
				// Parse redirect_uri from the URL
				idx := 0
				for i := range authURL {
					if len(authURL) > i+13 && authURL[i:i+13] == "redirect_uri=" {
						idx = i + 13
						break
					}
				}
				if idx == 0 {
					return
				}
				// Find end of redirect_uri value (next & or end)
				end := len(authURL)
				for i := idx; i < len(authURL); i++ {
					if authURL[i] == '&' {
						end = i
						break
					}
				}
				callbackURL := authURL[idx:end]
				resp, err := http.Get(callbackURL + "?code=" + mockToken)
				if err != nil {
					return
				}
				_ = resp.Body.Close()
			}()
			return nil
		},
	}

	result, err := signer.Sign([]byte("test data"))
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.NotEmpty(t, result.Bundle)
}

// --- signWithToken Tests ---

func TestSignWithToken_ProducesValidBundle(t *testing.T) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"email":"test@example.com"}`))
	token := header + "." + payload + ".sig"

	result, err := signWithToken([]byte("hello world"), token)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify the bundle is valid JSON
	var bundle SigstoreBundle
	err = json.Unmarshal([]byte(result.Bundle), &bundle)
	require.NoError(t, err)

	// Check required fields
	assert.Equal(t, "application/vnd.dev.sigstore.bundle.v0.3+json", bundle.MediaType)
	assert.NotNil(t, bundle.VerificationMaterial)
	assert.NotNil(t, bundle.VerificationMaterial.Certificate)
	assert.NotEmpty(t, bundle.VerificationMaterial.Certificate.RawBytes)
	assert.NotNil(t, bundle.MessageSignature)
	assert.NotEmpty(t, bundle.MessageSignature.Signature)
	assert.Equal(t, "SHA2_256", bundle.MessageSignature.MessageDigest.Algorithm)
	assert.NotEmpty(t, bundle.MessageSignature.MessageDigest.Digest)

	// Check identity extraction
	assert.Equal(t, "test@example.com", result.SignerIdentity)
}

func TestSignWithToken_ExtractsSubWhenNoEmail(t *testing.T) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"sub":"github-user-123"}`))
	token := header + "." + payload + ".sig"

	result, err := signWithToken([]byte("data"), token)
	require.NoError(t, err)
	assert.Equal(t, "github-user-123", result.SignerIdentity)
}

func TestSignWithToken_UnknownIdentityForBadToken(t *testing.T) {
	result, err := signWithToken([]byte("data"), "not-a-jwt")
	require.NoError(t, err)
	assert.Equal(t, "unknown", result.SignerIdentity)
}

// --- extractIdentityFromToken Tests ---

func TestExtractIdentityFromToken(t *testing.T) {
	tests := []struct {
		name     string
		token    string
		expected string
	}{
		{
			name: "email in JWT",
			token: base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`)) + "." +
				base64.RawURLEncoding.EncodeToString([]byte(`{"email":"user@example.com"}`)) + ".sig",
			expected: "user@example.com",
		},
		{
			name: "sub only in JWT",
			token: base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`)) + "." +
				base64.RawURLEncoding.EncodeToString([]byte(`{"sub":"12345"}`)) + ".sig",
			expected: "12345",
		},
		{
			name: "email preferred over sub",
			token: base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`)) + "." +
				base64.RawURLEncoding.EncodeToString([]byte(`{"email":"user@example.com","sub":"12345"}`)) + ".sig",
			expected: "user@example.com",
		},
		{
			name:     "invalid token",
			token:    "not-a-jwt",
			expected: "unknown",
		},
		{
			name:     "empty token",
			token:    "",
			expected: "unknown",
		},
		{
			name:     "invalid base64 payload",
			token:    base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`)) + ".!!!invalid!!!.sig",
			expected: "unknown",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := extractIdentityFromToken(tc.token)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// --- SignFile Tests ---

func TestSignFile_ReadsAndSigns(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "test.skl")
	err := os.WriteFile(filePath, []byte("skill content"), 0644)
	require.NoError(t, err)

	expected := &SignResult{
		Bundle:         `{"test": true}`,
		SignerIdentity: "test@example.com",
	}
	signer := &mockSigner{result: expected, err: nil}

	result, err := SignFile(signer, filePath)
	require.NoError(t, err)
	assert.Equal(t, expected, result)
}

func TestSignFile_ErrorOnMissingFile(t *testing.T) {
	signer := &mockSigner{result: nil, err: nil}

	result, err := SignFile(signer, "/nonexistent/file.skl")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "failed to read file")
}

// --- ParseBundle Tests ---

func TestParseBundle_Valid(t *testing.T) {
	bundleJSON := `{
		"mediaType": "application/vnd.dev.sigstore.bundle.v0.3+json",
		"verificationMaterial": {
			"certificate": {"rawBytes": "dGVzdA=="},
			"tlogEntries": []
		},
		"messageSignature": {
			"messageDigest": {"algorithm": "SHA2_256", "digest": "abc123"},
			"signature": "c2lnbmF0dXJl"
		}
	}`

	bundle, err := ParseBundle([]byte(bundleJSON))
	require.NoError(t, err)
	assert.Equal(t, "application/vnd.dev.sigstore.bundle.v0.3+json", bundle.MediaType)
	assert.NotNil(t, bundle.VerificationMaterial)
	assert.NotNil(t, bundle.VerificationMaterial.Certificate)
}

func TestParseBundle_InvalidJSON(t *testing.T) {
	_, err := ParseBundle([]byte("not json"))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid bundle JSON")
}

func TestParseBundle_MissingMediaType(t *testing.T) {
	_, err := ParseBundle([]byte(`{"verificationMaterial": {}}`))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing mediaType")
}

func TestParseBundle_MissingVerificationMaterial(t *testing.T) {
	_, err := ParseBundle([]byte(`{"mediaType": "test"}`))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing verificationMaterial")
}

// --- NewSigner Tests ---

func TestNewSigner_ReturnsGracefulSigner(t *testing.T) {
	// Clear CI env vars
	for _, key := range []string{"GITHUB_ACTIONS", "GITLAB_CI", "CI"} {
		t.Setenv(key, "")
		_ = os.Unsetenv(key)
	}

	signer := NewSigner()
	_, ok := signer.(*GracefulSigner)
	assert.True(t, ok, "NewSigner should return a GracefulSigner")
}

func TestNewSigner_CIReturnsGracefulWithCISigner(t *testing.T) {
	t.Setenv("CI", "true")

	signer := NewSigner()
	graceful, ok := signer.(*GracefulSigner)
	require.True(t, ok)
	_, ok = graceful.Inner.(*CISigner)
	assert.True(t, ok, "inner signer should be CISigner in CI")
}

func TestNewSigner_NonCIReturnsGracefulWithInteractiveSigner(t *testing.T) {
	for _, key := range []string{"GITHUB_ACTIONS", "GITLAB_CI", "CI"} {
		t.Setenv(key, "")
		_ = os.Unsetenv(key)
	}

	signer := NewSigner()
	graceful, ok := signer.(*GracefulSigner)
	require.True(t, ok)
	_, ok = graceful.Inner.(*InteractiveSigner)
	assert.True(t, ok, "inner signer should be InteractiveSigner outside CI")
}
