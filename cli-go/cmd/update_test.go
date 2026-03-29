package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupUpdateTestEnv creates a test environment with an installed skill at an old version.
func setupUpdateTestEnv(t *testing.T) (spmHome string, cwd string) {
	t.Helper()
	tmpDir := t.TempDir()

	spmHome = filepath.Join(tmpDir, ".spm")
	cwd = filepath.Join(tmpDir, "project")

	require.NoError(t, os.MkdirAll(filepath.Join(spmHome, "skills"), 0o755))
	require.NoError(t, os.MkdirAll(filepath.Join(spmHome, "cache"), 0o755))
	require.NoError(t, os.MkdirAll(cwd, 0o755))

	// Write skills.json with an existing skill
	sjContent, _ := json.MarshalIndent(map[string]any{
		"skills": map[string]string{
			"updatable-skill": "^1.0.0",
		},
	}, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(cwd, "skills.json"), sjContent, 0o644))

	// Write lock file with old version
	lockContent, _ := json.MarshalIndent(map[string]any{
		"lockfileVersion": 1,
		"generated_at":    "2025-01-01T00:00:00Z",
		"generated_by":    "spm@0.0.1",
		"skills": map[string]any{
			"updatable-skill": map[string]string{
				"version":  "1.0.0",
				"resolved": "https://example.com/updatable-skill-1.0.0.skl",
				"checksum": "old-hash",
				"source":   "registry",
			},
		},
	}, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(cwd, "skills-lock.json"), lockContent, 0o644))

	t.Setenv("SPM_HOME", spmHome)
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(cwd))
	t.Cleanup(func() { _ = os.Chdir(origDir) })

	return spmHome, cwd
}

func TestUpdateDetectsNewerVersion(t *testing.T) {
	spmHome, cwd := setupUpdateTestEnv(t)
	sklData := createTestSkl(t, "updatable-skill", "1.2.0")

	dlSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(sklData)
	}))
	defer dlSrv.Close()

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/resolve":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "updatable-skill",
						"version":         "1.2.0",
						"checksum_sha256": "new-hash",
						"download_url":    dlSrv.URL + "/updatable-skill-1.2.0.skl",
						"size_bytes":      len(sklData),
						"trust_tier":      "verified",
						"signed":          false,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		case "/api/v1/skills/updatable-skill/1.2.0/download":
			http.Redirect(w, r, dlSrv.URL+"/updatable-skill-1.2.0.skl", http.StatusFound)
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"update"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "updatable-skill")
	assert.Contains(t, out, "1.0.0")
	assert.Contains(t, out, "1.2.0")
	assert.Contains(t, out, "1 skill(s) updated")

	// Verify new version extracted
	assert.DirExists(t, filepath.Join(spmHome, "skills", "updatable-skill", "1.2.0"))

	// Verify lock file updated
	lockData, err := os.ReadFile(filepath.Join(cwd, "skills-lock.json"))
	require.NoError(t, err)
	assert.Contains(t, string(lockData), "1.2.0")
}

func TestUpdateAlreadyUpToDate(t *testing.T) {
	setupUpdateTestEnv(t)

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/v1/resolve" {
			// Return same version as locked
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "updatable-skill",
						"version":         "1.0.0",
						"checksum_sha256": "old-hash",
						"download_url":    "https://example.com/updatable-skill-1.0.0.skl",
						"size_bytes":      100,
						"trust_tier":      "verified",
						"signed":          false,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)

	rootCmd.SetArgs([]string{"update"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	assert.Contains(t, buf.String(), "up to date")
}

func TestUpdateNoSkillsJSON(t *testing.T) {
	tmpDir := t.TempDir()
	spmHome := filepath.Join(tmpDir, ".spm")
	cwd := filepath.Join(tmpDir, "project")
	require.NoError(t, os.MkdirAll(cwd, 0o755))
	require.NoError(t, os.MkdirAll(spmHome, 0o755))

	t.Setenv("SPM_HOME", spmHome)
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(cwd))
	t.Cleanup(func() { _ = os.Chdir(origDir) })

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"update"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	assert.Contains(t, buf.String(), "No skills.json")
}

func TestUpdateJSONOutput(t *testing.T) {
	_, _ = setupUpdateTestEnv(t)
	sklData := createTestSkl(t, "updatable-skill", "1.3.0")

	dlSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(sklData)
	}))
	defer dlSrv.Close()

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/resolve":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "updatable-skill",
						"version":         "1.3.0",
						"checksum_sha256": "newer-hash",
						"download_url":    dlSrv.URL + "/updatable-skill-1.3.0.skl",
						"size_bytes":      len(sklData),
						"trust_tier":      "verified",
						"signed":          false,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		case "/api/v1/skills/updatable-skill/1.3.0/download":
			http.Redirect(w, r, dlSrv.URL+"/updatable-skill-1.3.0.skl", http.StatusFound)
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"update"})
	err := rootCmd.Execute()

	require.NoError(t, err)

	var result updateJSONOutput
	err = json.Unmarshal(buf.Bytes(), &result)
	require.NoError(t, err, "output should be valid JSON: %s", buf.String())
	assert.Equal(t, "update", result.Command)
	assert.Equal(t, "success", result.Status)
	require.Len(t, result.Updates, 1)
	assert.Equal(t, "updatable-skill", result.Updates[0].Name)
	assert.Equal(t, "1.0.0", result.Updates[0].OldVersion)
	assert.Equal(t, "1.3.0", result.Updates[0].NewVersion)
}

func TestUpdateSpecificSkill(t *testing.T) {
	spmHome, _ := setupUpdateTestEnv(t)
	sklData := createTestSkl(t, "updatable-skill", "1.1.0")

	dlSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(sklData)
	}))
	defer dlSrv.Close()

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/resolve":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "updatable-skill",
						"version":         "1.1.0",
						"checksum_sha256": "hash-110",
						"download_url":    dlSrv.URL + "/updatable-skill-1.1.0.skl",
						"size_bytes":      len(sklData),
						"trust_tier":      "verified",
						"signed":          false,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		case "/api/v1/skills/updatable-skill/1.1.0/download":
			http.Redirect(w, r, dlSrv.URL+"/updatable-skill-1.1.0.skl", http.StatusFound)
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"update", "updatable-skill"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "updatable-skill")
	assert.DirExists(t, filepath.Join(spmHome, "skills", "updatable-skill", "1.1.0"))
}

func TestUpdateSkillNotInRegistry(t *testing.T) {
	setupUpdateTestEnv(t)

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/v1/resolve" {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"resolved": []any{},
				"unresolved": []map[string]any{
					{
						"name":  "updatable-skill",
						"range": "^1.0.0",
						"error": "skill not found in registry",
					},
				},
			})
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)

	rootCmd.SetArgs([]string{"update"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	assert.Contains(t, buf.String(), "up to date")
}
