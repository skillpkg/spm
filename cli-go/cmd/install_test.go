package cmd

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
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

// createTestSkl builds a minimal .skl (tar.gz) file containing a skill.json manifest.
func createTestSkl(t *testing.T, name, version string) []byte {
	t.Helper()
	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)

	manifest := map[string]any{
		"name":        name,
		"version":     version,
		"description": "A test skill",
	}
	mData, _ := json.Marshal(manifest)

	// Add skill.json
	require.NoError(t, tw.WriteHeader(&tar.Header{
		Name: "skill.json",
		Mode: 0o644,
		Size: int64(len(mData)),
	}))
	_, err := tw.Write(mData)
	require.NoError(t, err)

	// Add a skill.md
	readme := []byte("# " + name + "\nTest skill.")
	require.NoError(t, tw.WriteHeader(&tar.Header{
		Name: "skill.md",
		Mode: 0o644,
		Size: int64(len(readme)),
	}))
	_, err = tw.Write(readme)
	require.NoError(t, err)

	require.NoError(t, tw.Close())
	require.NoError(t, gw.Close())
	return buf.Bytes()
}

// setupInstallTestEnv creates a temp dir structure for install tests and sets env vars.
func setupInstallTestEnv(t *testing.T) (spmHome string, cwd string) {
	t.Helper()
	tmpDir := t.TempDir()

	spmHome = filepath.Join(tmpDir, ".spm")
	os.MkdirAll(filepath.Join(spmHome, "skills"), 0o755)
	os.MkdirAll(filepath.Join(spmHome, "cache"), 0o755)

	cwd = filepath.Join(tmpDir, "project")
	os.MkdirAll(cwd, 0o755)

	t.Setenv("SPM_HOME", spmHome)

	// Change to project directory for skills.json operations
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(cwd))
	t.Cleanup(func() { os.Chdir(origDir) })

	return spmHome, cwd
}

func TestInstallSuccess(t *testing.T) {
	spmHome, cwd := setupInstallTestEnv(t)
	sklData := createTestSkl(t, "my-skill", "1.0.0")

	// Download server serves the .skl file
	dlSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/gzip")
		w.Write(sklData)
	}))
	defer dlSrv.Close()

	// Registry API server
	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		switch {
		case r.URL.Path == "/api/v1/resolve" && r.Method == "POST":
			json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "my-skill",
						"version":         "1.0.0",
						"checksum_sha256": "abc123",
						"download_url":    dlSrv.URL + "/my-skill-1.0.0.skl",
						"size_bytes":      len(sklData),
						"trust_tier":      "verified",
						"signed":          false,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		case r.URL.Path == "/api/v1/skills/my-skill/1.0.0/download":
			http.Redirect(w, r, dlSrv.URL+"/my-skill-1.0.0.skl", http.StatusFound)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)

	// Reset flags
	installFlagAgents = ""
	installFlagNoLink = true // skip link since agent dirs are not at default home

	rootCmd.SetArgs([]string{"install", "my-skill"})
	err := rootCmd.Execute()

	require.NoError(t, err)

	// Verify skill was extracted
	skillDir := filepath.Join(spmHome, "skills", "my-skill", "1.0.0")
	assert.DirExists(t, skillDir)
	assert.FileExists(t, filepath.Join(skillDir, "skill.json"))

	// Verify skills.json was updated
	sjData, err := os.ReadFile(filepath.Join(cwd, "skills.json"))
	require.NoError(t, err)
	assert.Contains(t, string(sjData), "my-skill")

	// Verify lock file was created
	lockData, err := os.ReadFile(filepath.Join(cwd, "skills-lock.json"))
	require.NoError(t, err)
	assert.Contains(t, string(lockData), "my-skill")
	assert.Contains(t, string(lockData), "1.0.0")
}

func TestInstallAlreadyInstalled(t *testing.T) {
	_, cwd := setupInstallTestEnv(t)

	// Pre-populate lock file with the skill already installed
	lockContent := `{
  "lockfileVersion": 1,
  "generated_at": "2025-01-01T00:00:00Z",
  "generated_by": "spm@0.0.1",
  "skills": {
    "my-skill": {
      "version": "1.0.0",
      "resolved": "https://example.com/my-skill-1.0.0.skl",
      "checksum": "abc123",
      "source": "registry"
    }
  }
}`
	os.WriteFile(filepath.Join(cwd, "skills-lock.json"), []byte(lockContent), 0o644)

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/v1/resolve" {
			json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "my-skill",
						"version":         "1.0.0",
						"checksum_sha256": "abc123",
						"download_url":    "https://example.com/my-skill-1.0.0.skl",
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
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"install", "my-skill@1.0.0"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	assert.Contains(t, buf.String(), "already installed")
}

func TestInstallNotFound(t *testing.T) {
	setupInstallTestEnv(t)

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/api/v1/resolve" {
			json.NewEncoder(w).Encode(map[string]any{
				"resolved": []any{},
				"unresolved": []map[string]any{
					{
						"name":       "nonexistent",
						"range":      "latest",
						"error":      "skill not found",
						"suggestion": "existing-skill",
					},
				},
			})
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"install", "nonexistent"})
	err := rootCmd.Execute()

	assert.Error(t, err)
	assert.Contains(t, buf.String(), "Skill not found")
}

func TestInstallNetworkError(t *testing.T) {
	setupInstallTestEnv(t)

	// Use a server that immediately closes
	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	apiSrv.Close() // Close immediately to simulate network error

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"install", "some-skill"})
	err := rootCmd.Execute()

	assert.Error(t, err)
}

func TestInstallJSONOutput(t *testing.T) {
	spmHome, _ := setupInstallTestEnv(t)
	sklData := createTestSkl(t, "json-skill", "2.0.0")

	dlSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(sklData)
	}))
	defer dlSrv.Close()

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/api/v1/resolve":
			json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "json-skill",
						"version":         "2.0.0",
						"checksum_sha256": "def456",
						"download_url":    dlSrv.URL + "/json-skill-2.0.0.skl",
						"size_bytes":      len(sklData),
						"trust_tier":      "scanned",
						"signed":          true,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		case r.URL.Path == "/api/v1/skills/json-skill/2.0.0/download":
			http.Redirect(w, r, dlSrv.URL+"/json-skill-2.0.0.skl", http.StatusFound)
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"install", "json-skill@2.0.0"})
	err := rootCmd.Execute()

	require.NoError(t, err)

	var result installJSONOutput
	err = json.Unmarshal(buf.Bytes(), &result)
	require.NoError(t, err, "output should be valid JSON: %s", buf.String())
	assert.Equal(t, "install", result.Command)
	assert.Equal(t, "success", result.Status)
	require.Len(t, result.Skills, 1)
	assert.Equal(t, "json-skill", result.Skills[0].Name)
	assert.Equal(t, "2.0.0", result.Skills[0].Version)

	// Verify file extracted
	assert.DirExists(t, filepath.Join(spmHome, "skills", "json-skill", "2.0.0"))
}

func TestInstallFromSkillsJSON(t *testing.T) {
	spmHome, cwd := setupInstallTestEnv(t)
	sklData := createTestSkl(t, "existing-skill", "1.5.0")

	// Write skills.json in project dir
	sjContent := `{"skills": {"existing-skill": "^1.0.0"}}`
	os.WriteFile(filepath.Join(cwd, "skills.json"), []byte(sjContent), 0o644)

	dlSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(sklData)
	}))
	defer dlSrv.Close()

	apiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.URL.Path == "/api/v1/resolve":
			json.NewEncoder(w).Encode(map[string]any{
				"resolved": []map[string]any{
					{
						"name":            "existing-skill",
						"version":         "1.5.0",
						"checksum_sha256": "hash123",
						"download_url":    dlSrv.URL + "/existing-skill-1.5.0.skl",
						"size_bytes":      len(sklData),
						"trust_tier":      "verified",
						"signed":          false,
						"scan_status":     "clean",
						"dependencies":    []string{},
					},
				},
				"unresolved": []any{},
			})
		case r.URL.Path == "/api/v1/skills/existing-skill/1.5.0/download":
			http.Redirect(w, r, dlSrv.URL+"/existing-skill-1.5.0.skl", http.StatusFound)
		}
	}))
	defer apiSrv.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	t.Setenv("SPM_REGISTRY", apiSrv.URL)
	installFlagNoLink = true

	rootCmd.SetArgs([]string{"install"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	assert.Contains(t, buf.String(), "1 skill(s) installed")
	assert.DirExists(t, filepath.Join(spmHome, "skills", "existing-skill", "1.5.0"))
}
