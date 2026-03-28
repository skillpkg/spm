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

func setupSearchTest(t *testing.T, handler http.HandlerFunc, mode output.Mode) (*httptest.Server, *bytes.Buffer) {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Setenv("SPM_REGISTRY", srv.URL)
	t.Setenv("SPM_HOME", t.TempDir())

	var buf bytes.Buffer
	Out = &output.Output{Mode: mode, Writer: &buf, ErrW: &buf}
	return srv, &buf
}

func TestSearchHumanOutput(t *testing.T) {
	srv, buf := setupSearchTest(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/skills", r.URL.Path)
		assert.Equal(t, "test", r.URL.Query().Get("q"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"results": []map[string]any{
				{
					"name":        "code-review",
					"version":     "1.2.0",
					"description": "Automated code review skill",
					"author":      map[string]string{"username": "alice", "trust_tier": "verified"},
					"downloads":   1500,
					"tags":        []string{"review", "lint"},
				},
				{
					"name":        "test-gen",
					"version":     "0.5.1",
					"description": "Generate test cases automatically",
					"author":      map[string]string{"username": "bob", "trust_tier": "registered"},
					"downloads":   320,
					"tags":        []string{"testing"},
				},
			},
			"total":    2,
			"page":     1,
			"per_page": 20,
			"pages":    1,
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"search", "test"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "code-review")
	assert.Contains(t, out, "1.2.0")
	assert.Contains(t, out, "test-gen")
	assert.Contains(t, out, "2 results found")
}

func TestSearchJSONOutput(t *testing.T) {
	srv, buf := setupSearchTest(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"results": []map[string]any{
				{
					"name":        "hello-skill",
					"version":     "1.0.0",
					"description": "Hello world skill",
					"author":      map[string]string{"username": "dev", "trust_tier": "registered"},
					"downloads":   10,
				},
			},
			"total":    1,
			"page":     1,
			"per_page": 20,
			"pages":    1,
		})
	}, output.ModeJSON)
	defer srv.Close()

	rootCmd.SetArgs([]string{"search", "hello"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()

	var result map[string]any
	err = json.Unmarshal([]byte(out), &result)
	require.NoError(t, err, "output should be valid JSON")
	assert.Equal(t, float64(1), result["total"])
}

func TestSearchEmptyResults(t *testing.T) {
	srv, buf := setupSearchTest(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"results":  []any{},
			"total":    0,
			"page":     1,
			"per_page": 20,
			"pages":    0,
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"search", "nonexistent"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "No skills found")
	assert.Contains(t, out, "nonexistent")
}

func TestSearchWithFilters(t *testing.T) {
	srv, _ := setupSearchTest(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "coding", r.URL.Query().Get("category"))
		assert.Equal(t, "verified", r.URL.Query().Get("trust"))
		assert.Equal(t, "downloads", r.URL.Query().Get("sort"))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"results":  []any{},
			"total":    0,
			"page":     1,
			"per_page": 10,
			"pages":    0,
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"search", "test", "--category", "coding", "--trust-tier", "verified", "--sort", "downloads", "--limit", "10"})
	err := rootCmd.Execute()

	require.NoError(t, err)
}

func TestSearchServerError(t *testing.T) {
	srv, _ := setupSearchTest(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{
			"error":   "internal_error",
			"message": "database unavailable",
		})
	}, output.ModeHuman)
	defer srv.Close()

	rootCmd.SetArgs([]string{"search", "test"})
	err := rootCmd.Execute()

	assert.Error(t, err)
}
