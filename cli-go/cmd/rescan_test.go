package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRescan_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/my-skill/1.0.0/rescan" && r.Method == http.MethodPost {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"name":        "my-skill",
				"version":     "1.0.0",
				"scan_status": "pending",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "admin-token", Registry: server.URL}

	err := runRescan(nil, []string{"my-skill@1.0.0"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "rescan", result["command"])
	assert.Equal(t, "success", result["status"])
	assert.Equal(t, "my-skill", result["name"])
	assert.Equal(t, "1.0.0", result["version"])
}

func TestRescan_InvalidSpecifier(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "admin-token", Registry: "http://localhost:9999"}

	err := runRescan(nil, []string{"no-version"})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "invalid_specifier", result["error"])
	} else {
		assert.Contains(t, err.Error(), "invalid specifier")
	}
}

func TestRescan_NoAuth(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "", Registry: "http://localhost:9999"}

	err := runRescan(nil, []string{"my-skill@1.0.0"})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "not_logged_in", result["error"])
	} else {
		assert.Contains(t, err.Error(), "not logged in")
	}
}

func TestRescan_Forbidden(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":   "forbidden",
			"message": "Admin access required",
		})
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "user-token", Registry: server.URL}

	err := runRescan(nil, []string{"my-skill@1.0.0"})
	_ = err

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "forbidden", result["error"])
}

func TestRescan_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":   "version_not_found",
			"message": "Version not found",
		})
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "admin-token", Registry: server.URL}

	err := runRescan(nil, []string{"missing@1.0.0"})
	_ = err

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "version_not_found", result["error"])
}

func TestRescan_HumanOutput(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"name":        "my-skill",
				"version":     "1.0.0",
				"scan_status": "pending",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "admin-token", Registry: server.URL}

	err := runRescan(nil, []string{"my-skill@1.0.0"})
	require.NoError(t, err)
	assert.Contains(t, buf.String(), "Rescan requested")
	assert.Contains(t, buf.String(), "my-skill")
}
