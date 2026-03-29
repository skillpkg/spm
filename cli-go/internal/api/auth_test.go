package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/BurntSushi/toml"
	"github.com/skillpkg/spm/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- DeviceCode ---

func TestDeviceCode_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/device-code", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(DeviceCodeResponse{
			DeviceCode:      "abc123",
			UserCode:        "ABCD-1234",
			VerificationURI: "https://github.com/login/device",
			ExpiresIn:       900,
			Interval:        5,
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.DeviceCode()
	require.NoError(t, err)
	assert.Equal(t, "abc123", resp.DeviceCode)
	assert.Equal(t, "ABCD-1234", resp.UserCode)
	assert.Equal(t, "https://github.com/login/device", resp.VerificationURI)
	assert.Equal(t, 900, resp.ExpiresIn)
	assert.Equal(t, 5, resp.Interval)
}

// --- PollToken ---

func TestPollToken_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, r *http.Request) {
		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "abc123", body["device_code"])
		assert.Equal(t, "urn:ietf:params:oauth:grant-type:device_code", body["grant_type"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(TokenResponse{
			Token: "spm_token_123",
			User: TokenUser{
				ID:          "user-1",
				Username:    "almog",
				GithubLogin: "almog",
				TrustTier:   "verified",
			},
		})
	})

	_, client := newTestServer(t, mux)
	result, err := client.PollToken("abc123")
	require.NoError(t, err)
	require.NotNil(t, result.Token)
	assert.Equal(t, "spm_token_123", result.Token.Token)
	assert.Equal(t, "almog", result.Token.User.Username)
}

func TestPollToken_Pending(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(428)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "authorization_pending",
		})
	})

	_, client := newTestServer(t, mux)
	result, err := client.PollToken("abc123")
	require.NoError(t, err)
	assert.Nil(t, result.Token)
	assert.Equal(t, PollPending, result.Status)
}

func TestPollToken_SlowDown(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(428)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "slow_down",
		})
	})

	_, client := newTestServer(t, mux)
	result, err := client.PollToken("abc123")
	require.NoError(t, err)
	assert.Nil(t, result.Token)
	assert.Equal(t, PollSlowDown, result.Status)
}

func TestPollToken_Expired(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(410)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error": "expired_token",
		})
	})

	_, client := newTestServer(t, mux)
	result, err := client.PollToken("abc123")
	require.NoError(t, err)
	assert.Nil(t, result.Token)
	assert.Equal(t, PollExpired, result.Status)
}

// --- PollDeviceFlow ---

func TestPollDeviceFlow_PendingThenSuccess(t *testing.T) {
	var callCount atomic.Int32
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		count := callCount.Add(1)
		w.Header().Set("Content-Type", "application/json")

		if count <= 2 {
			// First two calls: pending
			w.WriteHeader(428)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "authorization_pending",
			})
			return
		}

		// Third call: success
		_ = json.NewEncoder(w).Encode(TokenResponse{
			Token: "spm_final_token",
			User:  TokenUser{Username: "almog"},
		})
	})

	_, client := newTestServer(t, mux)
	token, err := client.PollDeviceFlow("abc123", DeviceFlowConfig{
		PollInterval: 1 * time.Millisecond,
		ExpiresIn:    5 * time.Second,
		Sleep:        func(_ time.Duration) {}, // no-op sleep for tests
	})
	require.NoError(t, err)
	assert.Equal(t, "spm_final_token", token.Token)
	assert.Equal(t, int32(3), callCount.Load())
}

func TestPollDeviceFlow_SlowDownIncreasesInterval(t *testing.T) {
	var callCount atomic.Int32
	var intervals []time.Duration
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		count := callCount.Add(1)
		w.Header().Set("Content-Type", "application/json")

		if count == 1 {
			w.WriteHeader(428)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "slow_down"})
			return
		}

		_ = json.NewEncoder(w).Encode(TokenResponse{
			Token: "spm_token",
			User:  TokenUser{Username: "almog"},
		})
	})

	_, client := newTestServer(t, mux)
	token, err := client.PollDeviceFlow("abc123", DeviceFlowConfig{
		PollInterval: 100 * time.Millisecond,
		ExpiresIn:    10 * time.Second,
		Sleep: func(d time.Duration) {
			intervals = append(intervals, d)
		},
	})
	require.NoError(t, err)
	assert.Equal(t, "spm_token", token.Token)

	// After slow_down, interval should increase by 5s
	require.Len(t, intervals, 2)
	assert.Equal(t, 100*time.Millisecond, intervals[0])
	assert.Equal(t, 100*time.Millisecond+5*time.Second, intervals[1])
}

func TestPollDeviceFlow_Expired(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(410)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "expired_token"})
	})

	_, client := newTestServer(t, mux)
	_, err := client.PollDeviceFlow("abc123", DeviceFlowConfig{
		PollInterval: 1 * time.Millisecond,
		ExpiresIn:    5 * time.Second,
		Sleep:        func(_ time.Duration) {},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "expired")
}

func TestPollDeviceFlow_Timeout(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/token", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(428)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "authorization_pending"})
	})

	_, client := newTestServer(t, mux)

	callCount := 0
	_, err := client.PollDeviceFlow("abc123", DeviceFlowConfig{
		PollInterval: 1 * time.Millisecond,
		ExpiresIn:    1 * time.Millisecond, // Expire immediately
		Sleep: func(_ time.Duration) {
			callCount++
			if callCount > 100 {
				// Safety valve
				t.Fatal("too many poll attempts")
			}
		},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "expired")
}

// --- Token persistence (config integration) ---

func TestTokenSaveAndLoad(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", tmpDir)

	// Save token
	cfg := &config.Config{Token: "spm_test_token_123"}
	err := config.Save(cfg)
	require.NoError(t, err)

	// Verify file exists with correct permissions
	configPath := filepath.Join(tmpDir, "config.toml")
	info, err := os.Stat(configPath)
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o600), info.Mode().Perm())

	// Load and verify
	loaded, err := config.Load()
	require.NoError(t, err)
	assert.Equal(t, "spm_test_token_123", loaded.Token)
}

func TestTokenClearOnLogout(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", tmpDir)

	// Save token
	cfg := &config.Config{Token: "spm_test_token", Registry: "https://custom.registry.dev"}
	err := config.Save(cfg)
	require.NoError(t, err)

	// Clear token (simulate logout)
	cfg.Token = ""
	err = config.Save(cfg)
	require.NoError(t, err)

	// Load and verify token is gone but registry persists
	loaded, err := config.Load()
	require.NoError(t, err)
	assert.Empty(t, loaded.Token)
	assert.Equal(t, "https://custom.registry.dev", loaded.Registry)
}

func TestTokenEnvOverride(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", tmpDir)
	t.Setenv("SPM_TOKEN", "env-token-override")

	// Save a different token to file
	cfg := &config.Config{Token: "file-token"}
	err := config.Save(cfg)
	require.NoError(t, err)

	// Load — env should override
	loaded, err := config.Load()
	require.NoError(t, err)
	assert.Equal(t, "env-token-override", loaded.Token)
}

func TestTokenLoadFromTOML(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", tmpDir)
	// Clear env token if set
	t.Setenv("SPM_TOKEN", "")

	// Write TOML directly
	configPath := filepath.Join(tmpDir, "config.toml")
	f, err := os.Create(configPath)
	require.NoError(t, err)
	err = toml.NewEncoder(f).Encode(config.Config{
		Token:    "toml-token",
		Registry: "https://my-registry.dev",
	})
	require.NoError(t, err)
	require.NoError(t, f.Close())

	loaded, err := config.Load()
	require.NoError(t, err)
	assert.Equal(t, "toml-token", loaded.Token)
	assert.Equal(t, "https://my-registry.dev", loaded.Registry)
}

// --- DeviceCode error handling ---

func TestDeviceCode_ServerError(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/device-code", jsonHandler(t, 500, map[string]string{
		"error":   "internal_error",
		"message": "Server error",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.DeviceCode()
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.True(t, apiErr.IsServerError())
}

func TestDeviceCode_NetworkError(t *testing.T) {
	// Create a server and immediately close it
	srv := httptest.NewServer(http.NotFoundHandler())
	url := srv.URL
	srv.Close()

	client := NewClient(url, "")
	_, err := client.DeviceCode()
	require.Error(t, err)
}
