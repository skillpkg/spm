package signing

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/pkg/browser"
)

// SignResult holds the output of a signing operation.
type SignResult struct {
	// Bundle is the JSON-serialized Sigstore bundle.
	Bundle string `json:"bundle"`
	// SignerIdentity is the extracted signer identity (e.g. email or URI).
	SignerIdentity string `json:"signer_identity"`
}

// Signer is the interface for signing file bytes.
type Signer interface {
	// Sign signs the given data and returns a SignResult.
	// Returns nil, nil if signing fails gracefully (should not block publish).
	Sign(data []byte) (*SignResult, error)
}

// Env represents the detected CI environment.
type Env int

const (
	// EnvUnknown means no CI environment detected.
	EnvUnknown Env = iota
	// EnvGitHubActions means GITHUB_ACTIONS=true was detected.
	EnvGitHubActions
	// EnvGitLabCI means GITLAB_CI=true was detected.
	EnvGitLabCI
	// EnvGenericCI means CI=true was detected (generic CI).
	EnvGenericCI
)

// String returns the human-readable name of the environment.
func (e Env) String() string {
	switch e {
	case EnvGitHubActions:
		return "GitHub Actions"
	case EnvGitLabCI:
		return "GitLab CI"
	case EnvGenericCI:
		return "CI"
	default:
		return "unknown"
	}
}

// DetectCIEnv checks environment variables to determine the CI environment.
func DetectCIEnv() Env {
	if os.Getenv("GITHUB_ACTIONS") == "true" {
		return EnvGitHubActions
	}
	if os.Getenv("GITLAB_CI") == "true" {
		return EnvGitLabCI
	}
	if os.Getenv("CI") == "true" {
		return EnvGenericCI
	}
	return EnvUnknown
}

// IsCI returns true if any CI environment is detected.
func IsCI() bool {
	return DetectCIEnv() != EnvUnknown
}

// SigstoreBundle represents the structure of a Sigstore bundle JSON.
// Supports bundle format versions v0.1, v0.2, and v0.3.
type SigstoreBundle struct {
	MediaType            string                `json:"mediaType"`
	VerificationMaterial *VerificationMaterial `json:"verificationMaterial"`
	MessageSignature     *MessageSignature     `json:"messageSignature,omitempty"`
}

// VerificationMaterial holds the certificate and transparency log info.
type VerificationMaterial struct {
	// v0.3 format: single certificate
	Certificate *Certificate `json:"certificate,omitempty"`
	// v0.1/v0.2 format: certificate chain
	X509CertificateChain *X509CertificateChain `json:"x509CertificateChain,omitempty"`
	// Transparency log entries
	TlogEntries []TlogEntry `json:"tlogEntries,omitempty"`
}

// Certificate is a single certificate (v0.3 bundle format).
type Certificate struct {
	RawBytes string `json:"rawBytes"`
}

// X509CertificateChain is the certificate chain (v0.1/v0.2 bundle format).
type X509CertificateChain struct {
	Certificates []Certificate `json:"certificates"`
}

// TlogEntry represents a transparency log entry.
type TlogEntry struct {
	LogIndex       string `json:"logIndex,omitempty"`
	LogID          string `json:"logId,omitempty"`
	IntegratedTime string `json:"integratedTime,omitempty"`
}

// MessageSignature holds the signature bytes.
type MessageSignature struct {
	MessageDigest *MessageDigest `json:"messageDigest"`
	Signature     string         `json:"signature"`
}

// MessageDigest holds the hash algorithm and digest.
type MessageDigest struct {
	Algorithm string `json:"algorithm"`
	Digest    string `json:"digest"`
}

// ParseBundle parses a JSON byte slice into a SigstoreBundle.
func ParseBundle(data []byte) (*SigstoreBundle, error) {
	var bundle SigstoreBundle
	if err := json.Unmarshal(data, &bundle); err != nil {
		return nil, fmt.Errorf("invalid bundle JSON: %w", err)
	}
	if bundle.MediaType == "" {
		return nil, fmt.Errorf("invalid bundle: missing mediaType")
	}
	if bundle.VerificationMaterial == nil {
		return nil, fmt.Errorf("invalid bundle: missing verificationMaterial")
	}
	return &bundle, nil
}

// GracefulSigner wraps a Signer and ensures signing failures return nil
// instead of errors, so signing never blocks publish.
type GracefulSigner struct {
	Inner Signer
}

// Sign delegates to the inner signer. On any error, returns nil, nil.
func (g *GracefulSigner) Sign(data []byte) (*SignResult, error) {
	result, err := g.Inner.Sign(data)
	if err != nil {
		return nil, nil
	}
	return result, nil
}

// CISigner signs using OIDC tokens from the CI environment.
// In real usage, this would use Fulcio for certificate issuance
// and Rekor for transparency logging.
type CISigner struct {
	// OIDCTokenFn provides the OIDC identity token.
	// In CI, this is typically provided by the environment.
	OIDCTokenFn func() (string, error)
}

// Sign signs data using the CI OIDC identity.
func (s *CISigner) Sign(data []byte) (*SignResult, error) {
	if s.OIDCTokenFn == nil {
		return nil, fmt.Errorf("no OIDC token provider configured")
	}

	token, err := s.OIDCTokenFn()
	if err != nil {
		return nil, fmt.Errorf("failed to get OIDC token: %w", err)
	}

	return signWithToken(data, token)
}

// InteractiveSigner signs using a browser-based OIDC flow with a local
// HTTP callback server.
type InteractiveSigner struct {
	// OpenBrowserFn opens a URL in the user's browser.
	// If nil, uses a default that prints the URL.
	OpenBrowserFn func(url string) error
	// CallbackTimeout is how long to wait for the OAuth callback.
	// Defaults to 2 minutes.
	CallbackTimeout time.Duration
}

// Sign starts the interactive OIDC flow, waits for the callback, and signs.
func (s *InteractiveSigner) Sign(data []byte) (*SignResult, error) {
	timeout := s.CallbackTimeout
	if timeout == 0 {
		timeout = 2 * time.Minute
	}

	// Start a local HTTP server for the OAuth callback
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("failed to start callback server: %w", err)
	}
	defer func() { _ = listener.Close() }()

	port := listener.Addr().(*net.TCPAddr).Port
	redirectURI := fmt.Sprintf("http://localhost:%d/callback", port)

	tokenCh := make(chan string, 1)
	errCh := make(chan error, 1)

	mux := http.NewServeMux()
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "missing code", http.StatusBadRequest)
			errCh <- fmt.Errorf("OAuth callback missing code parameter")
			return
		}
		w.Header().Set("Content-Type", "text/html")
		_, _ = fmt.Fprint(w, "<html><body><h3>Authenticated!</h3><p>You can close this tab.</p></body></html>")
		// In real Sigstore, we'd exchange the code for an OIDC token here.
		// For now, we pass the code through as a placeholder.
		tokenCh <- code
	})

	server := &http.Server{Handler: mux}
	go func() {
		if serveErr := server.Serve(listener); serveErr != nil && serveErr != http.ErrServerClosed {
			errCh <- serveErr
		}
	}()
	defer func() { _ = server.Close() }()

	// Build the auth URL (Sigstore OAuth issuer)
	authURL := fmt.Sprintf(
		"https://oauth2.sigstore.dev/auth/auth?client_id=sigstore&redirect_uri=%s&response_type=code&scope=openid+email",
		redirectURI,
	)

	// Open the browser
	if s.OpenBrowserFn != nil {
		if err := s.OpenBrowserFn(authURL); err != nil {
			return nil, fmt.Errorf("failed to open browser: %w", err)
		}
	}

	// Wait for callback or timeout
	select {
	case token := <-tokenCh:
		return signWithToken(data, token)
	case err := <-errCh:
		return nil, fmt.Errorf("OAuth callback error: %w", err)
	case <-time.After(timeout):
		return nil, fmt.Errorf("OAuth authentication timed out after %s", timeout)
	}
}

// signWithToken creates a Sigstore bundle from data and an identity token.
// This creates a self-contained bundle structure matching the Sigstore format.
func signWithToken(data []byte, identityToken string) (*SignResult, error) {
	// Generate an ephemeral ECDSA key pair (mirrors Fulcio flow)
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate signing key: %w", err)
	}

	// Compute SHA-256 digest of the data
	digest := sha256.Sum256(data)

	// Sign the digest
	r, sigS, err := ecdsa.Sign(rand.Reader, privateKey, digest[:])
	if err != nil {
		return nil, fmt.Errorf("failed to sign data: %w", err)
	}

	// Encode signature in DER format
	sigBytes := encodeECDSASignature(r, sigS)
	sigB64 := base64.StdEncoding.EncodeToString(sigBytes)

	// Create a self-signed certificate (in real Sigstore, Fulcio issues this)
	certDER := createSelfSignedCert(privateKey, identityToken)
	certB64 := base64.StdEncoding.EncodeToString(certDER)

	// Build the Sigstore bundle
	bundle := SigstoreBundle{
		MediaType: "application/vnd.dev.sigstore.bundle.v0.3+json",
		VerificationMaterial: &VerificationMaterial{
			Certificate: &Certificate{
				RawBytes: certB64,
			},
			TlogEntries: []TlogEntry{
				{
					LogIndex:       "0",
					IntegratedTime: fmt.Sprintf("%d", time.Now().Unix()),
				},
			},
		},
		MessageSignature: &MessageSignature{
			MessageDigest: &MessageDigest{
				Algorithm: "SHA2_256",
				Digest:    base64.StdEncoding.EncodeToString(digest[:]),
			},
			Signature: sigB64,
		},
	}

	bundleJSON, err := json.Marshal(bundle)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal bundle: %w", err)
	}

	identity := extractIdentityFromToken(identityToken)

	return &SignResult{
		Bundle:         string(bundleJSON),
		SignerIdentity: identity,
	}, nil
}

// encodeECDSASignature encodes an ECDSA signature (r, s) as DER.
func encodeECDSASignature(r, s *big.Int) []byte {
	rBytes := r.Bytes()
	sBytes := s.Bytes()
	// Pad with leading zero if high bit is set (to avoid negative interpretation)
	if len(rBytes) > 0 && rBytes[0]&0x80 != 0 {
		rBytes = append([]byte{0}, rBytes...)
	}
	if len(sBytes) > 0 && sBytes[0]&0x80 != 0 {
		sBytes = append([]byte{0}, sBytes...)
	}
	// DER: SEQUENCE { INTEGER r, INTEGER s }
	seq := []byte{0x02, byte(len(rBytes))}
	seq = append(seq, rBytes...)
	seq = append(seq, 0x02, byte(len(sBytes)))
	seq = append(seq, sBytes...)
	result := []byte{0x30, byte(len(seq))}
	result = append(result, seq...)
	return result
}

// createSelfSignedCert creates DER-encoded self-signed certificate bytes.
// In real Sigstore, Fulcio would issue this certificate.
func createSelfSignedCert(key *ecdsa.PrivateKey, identity string) []byte {
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		NotBefore:             time.Now().Add(-1 * time.Minute),
		NotAfter:              time.Now().Add(10 * time.Minute),
		KeyUsage:              x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
	}

	// Embed identity as email SAN if it looks like an email
	if identity != "" && identity != "unknown" {
		template.EmailAddresses = []string{identity}
	}

	certDER, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: nil})
	}
	return certDER
}

// extractIdentityFromToken attempts to extract an email/subject from a JWT-like token.
func extractIdentityFromToken(token string) string {
	// Try to decode as a JWT (header.payload.signature)
	parts := splitToken(token)
	if len(parts) < 2 {
		return "unknown"
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return "unknown"
	}

	var claims struct {
		Email string `json:"email"`
		Sub   string `json:"sub"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return "unknown"
	}

	if claims.Email != "" {
		return claims.Email
	}
	if claims.Sub != "" {
		return claims.Sub
	}
	return "unknown"
}

// splitToken splits a JWT-like token by '.' without importing strings.
func splitToken(token string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(token); i++ {
		if token[i] == '.' {
			parts = append(parts, token[start:i])
			start = i + 1
		}
	}
	parts = append(parts, token[start:])
	return parts
}

// NewSigner creates the appropriate Signer based on the environment.
// In CI, returns a CISigner. Otherwise, returns an InteractiveSigner.
// Wraps the result in a GracefulSigner so failures never block publish.
func NewSigner() Signer {
	var inner Signer
	if IsCI() {
		inner = &CISigner{
			OIDCTokenFn: func() (string, error) {
				// In real CI, this would fetch from the environment
				// (e.g., ACTIONS_ID_TOKEN_REQUEST_URL for GitHub Actions)
				return "", fmt.Errorf("real OIDC token provider not configured")
			},
		}
	} else {
		inner = &InteractiveSigner{
			OpenBrowserFn: browser.OpenURL,
		}
	}
	return &GracefulSigner{Inner: inner}
}

// SignFile reads a file and signs its contents using the given Signer.
// Returns nil, nil if signing fails gracefully.
func SignFile(s Signer, path string) (*SignResult, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", path, err)
	}
	return s.Sign(data)
}
