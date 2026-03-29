package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupInfoTest(t *testing.T, handler http.HandlerFunc, mode output.Mode) (*httptest.Server, *bytes.Buffer) {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Setenv("SPM_REGISTRY", srv.URL)
	t.Setenv("SPM_HOME", t.TempDir())

	var buf bytes.Buffer
	Out = &output.Output{Mode: mode, Writer: &buf, ErrW: &buf}
	return srv, &buf
}

func TestInfoHumanOutput(t *testing.T) {
	srv, buf := setupInfoTest(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/skills/code-review", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"name":             "code-review",
			"description":      "Automated code review for PRs",
			"author":           map[string]string{"username": "alice", "trust_tier": "verified"},
			"category":         "coding",
			"tags":             []string{"review", "lint", "ci"},
			"platforms":        []string{"claude", "cursor"},
			"license":          "MIT",
			"repository":       "https://github.com/alice/code-review",
			"deprecated":       false,
			"latest_version":   "2.1.0",
			"downloads":        5000,
			"weekly_downloads": 320,
			"rating_avg":       4.5,
			"rating_count":     12,
			"security": map[string]any{
				"signed":          true,
				"signer_identity": "alice@github.com",
				"scan_status":     "passed",
			},
			"versions": []map[string]string{
				{"version": "2.1.0", "published_at": "2026-03-01"},
				{"version": "2.0.0", "published_at": "2026-01-15"},
			},
			"dependencies": map[string]any{
				"skills":   []string{"git-helper@^1.0"},
				"system":   []string{"git"},
				"packages": []string{},
			},
			"created_at": "2025-06-01",
			"updated_at": "2026-03-01",
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"info", "code-review"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "code-review@2.1.0")
	assert.Contains(t, out, "Automated code review for PRs")
	assert.Contains(t, out, "alice")
	assert.Contains(t, out, "MIT")
	assert.Contains(t, out, "coding")
	assert.Contains(t, out, "review, lint, ci")
	assert.Contains(t, out, "claude, cursor")
	assert.Contains(t, out, "git-helper@^1.0")
	assert.Contains(t, out, "2.1.0")
	assert.Contains(t, out, "2.0.0")
	assert.Contains(t, out, "spm install code-review")
}

func TestInfoJSONOutput(t *testing.T) {
	srv, buf := setupInfoTest(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"name":             "my-skill",
			"description":      "A test skill",
			"author":           map[string]string{"username": "bob", "trust_tier": "registered"},
			"category":         "testing",
			"latest_version":   "1.0.0",
			"downloads":        100,
			"weekly_downloads": 10,
			"security":         map[string]any{"signed": false, "scan_status": "pending"},
			"versions":         []any{},
			"dependencies":     map[string]any{"skills": []any{}, "system": []any{}, "packages": []any{}},
			"created_at":       "2026-01-01",
			"updated_at":       "2026-01-01",
		})
	}, output.ModeJSON)
	defer srv.Close()

	rootCmd.SetArgs([]string{"info", "my-skill"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()

	var result map[string]any
	err = json.Unmarshal([]byte(out), &result)
	require.NoError(t, err, "output should be valid JSON")
	assert.Equal(t, "my-skill", result["name"])
}

func TestInfoWithVersion(t *testing.T) {
	srv, buf := setupInfoTest(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/skills/my-skill/1.2.3", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"name":            "my-skill",
			"version":         "1.2.3",
			"size_bytes":      4096,
			"checksum_sha256": "abc123",
			"published_at":    "2026-02-01",
			"yanked":          false,
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"info", "my-skill@1.2.3"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "my-skill@1.2.3")
	assert.Contains(t, out, "4.0 KB")
}

func TestInfoNotFound(t *testing.T) {
	srv, _ := setupInfoTest(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "skill_not_found",
			"message": "Skill not found",
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"info", "nonexistent"})
	err := rootCmd.Execute()

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestInfoNotFoundJSON(t *testing.T) {
	srv, buf := setupInfoTest(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "skill_not_found",
			"message": "Skill not found",
		})
	}, output.ModeJSON)
	defer srv.Close()

	rootCmd.SetArgs([]string{"info", "nonexistent"})
	err := rootCmd.Execute()

	assert.Error(t, err)
	out := buf.String()
	var result map[string]any
	jsonErr := json.Unmarshal([]byte(out), &result)
	require.NoError(t, jsonErr, "error output should be valid JSON")
	assert.Equal(t, "not_found", result["error"])
}

func TestSplitNameVersion(t *testing.T) {
	tests := []struct {
		input   string
		name    string
		version string
	}{
		{"my-skill", "my-skill", ""},
		{"my-skill@1.0.0", "my-skill", "1.0.0"},
		{"@scope/skill@2.0.0", "@scope/skill", "2.0.0"},
		{"@scope/skill", "@scope/skill", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			name, ver := splitNameVersion(tt.input)
			assert.Equal(t, tt.name, name)
			assert.Equal(t, tt.version, ver)
		})
	}
}
