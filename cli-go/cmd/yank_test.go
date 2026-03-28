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

func TestParseNameVersion(t *testing.T) {
	tests := []struct {
		input   string
		name    string
		version string
		ok      bool
	}{
		{"my-skill@1.2.3", "my-skill", "1.2.3", true},
		{"@scope/skill@0.1.0", "@scope/skill", "0.1.0", true},
		{"nope", "", "", false},
		{"@scope/skill", "", "", false},
		{"skill@", "", "", false},
	}

	for _, tc := range tests {
		name, version, ok := parseNameVersion(tc.input)
		assert.Equal(t, tc.ok, ok, "input: %s", tc.input)
		if ok {
			assert.Equal(t, tc.name, name)
			assert.Equal(t, tc.version, version)
		}
	}
}

func TestYank_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/my-skill/1.0.0" && r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{
				"name":      "my-skill",
				"version":   "1.0.0",
				"yanked":    true,
				"reason":    "security issue",
				"yanked_at": "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	yankReason = "security issue"
	defer func() { yankReason = "" }()

	err := runYank(nil, []string{"my-skill@1.0.0"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "yank", result["command"])
	assert.Equal(t, "success", result["status"])
	assert.Equal(t, "my-skill", result["name"])
	assert.Equal(t, "1.0.0", result["version"])
	assert.Equal(t, true, result["yanked"])
}

func TestYank_InvalidSpecifier(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: "http://localhost:9999"}

	err := runYank(nil, []string{"no-version"})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "invalid_specifier", result["error"])
	} else {
		assert.Contains(t, err.Error(), "invalid specifier")
	}
}

func TestYank_NoAuth(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "", Registry: "http://localhost:9999"}

	err := runYank(nil, []string{"my-skill@1.0.0"})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "not_logged_in", result["error"])
	} else {
		assert.Contains(t, err.Error(), "not logged in")
	}
}

func TestYank_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]any{
			"error":   "version_not_found",
			"message": "Version not found",
		})
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}

	err := runYank(nil, []string{"missing@1.0.0"})
	// In JSON mode, error is output as JSON; function may return nil or error
	_ = err

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "version_not_found", result["error"])
}

func TestYank_HumanOutput(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{
				"name":      "my-skill",
				"version":   "1.0.0",
				"yanked":    true,
				"reason":    "old version",
				"yanked_at": "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	yankReason = "old version"
	defer func() { yankReason = "" }()

	err := runYank(nil, []string{"my-skill@1.0.0"})
	require.NoError(t, err)
	assert.Contains(t, buf.String(), "Yanked")
	assert.Contains(t, buf.String(), "my-skill")
}
