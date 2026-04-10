package cmd

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/signing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSign_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v1/skills/test-skill/1.0.0/download" && r.Method == http.MethodGet:
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("fake-skl-data"))
		case r.URL.Path == "/api/v1/skills/test-skill/sign" && r.Method == http.MethodPost:
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"name":            "test-skill",
				"version":         "1.0.0",
				"signed":          true,
				"signer_identity": "test@example.com",
				"signed_at":       "2026-01-01T00:00:00Z",
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(validManifestJSON()), 0o644))

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}

	SignerFactory = func() signing.Signer {
		return &mockSigner{
			result: &signing.SignResult{
				Bundle:         `{"mediaType":"test"}`,
				SignerIdentity: "test@example.com",
			},
		}
	}
	defer func() { SignerFactory = func() signing.Signer { return signing.NewSigner() } }()

	err := runSign(nil, []string{dir})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "sign", result["command"])
	assert.Equal(t, "signed", result["status"])
	assert.Equal(t, "test-skill", result["name"])
	assert.Equal(t, "1.0.0", result["version"])
	assert.Equal(t, "test@example.com", result["signer"])
}

func TestSign_NoAuth(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "", Registry: "http://localhost:9999"}

	err := runSign(nil, []string{"."})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "not_logged_in", result["error"])
	} else {
		assert.Contains(t, err.Error(), "not logged in")
	}
}

func TestSign_VersionNotPublished(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":   "SKILL_NOT_FOUND",
			"message": "Skill not found",
		})
	}))
	defer server.Close()

	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(validManifestJSON()), 0o644))

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}

	err := runSign(nil, []string{dir})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "error", result["status"])
	} else {
		assert.Contains(t, err.Error(), "download failed")
	}
}

func TestSign_SigningFails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/test-skill/1.0.0/download" {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("fake-skl-data"))
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(validManifestJSON()), 0o644))

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}

	SignerFactory = func() signing.Signer {
		return &mockSigner{err: fmt.Errorf("sigstore unavailable")}
	}
	defer func() { SignerFactory = func() signing.Signer { return signing.NewSigner() } }()

	err := runSign(nil, []string{dir})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "signing_failed", result["error"])
	} else {
		assert.Contains(t, err.Error(), "signing failed")
	}
}

func TestSign_SigningUnavailable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/test-skill/1.0.0/download" {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("fake-skl-data"))
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), []byte(validManifestJSON()), 0o644))

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}

	SignerFactory = func() signing.Signer {
		return &mockSigner{result: nil, err: nil}
	}
	defer func() { SignerFactory = func() signing.Signer { return signing.NewSigner() } }()

	err := runSign(nil, []string{dir})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "signing_unavailable", result["error"])
	} else {
		assert.Contains(t, err.Error(), "signing unavailable")
	}
}
