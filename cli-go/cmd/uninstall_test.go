package cmd

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupUninstallTestEnv creates a populated test environment with an installed skill.
func setupUninstallTestEnv(t *testing.T, skillName string) (spmHome string, cwd string) {
	t.Helper()
	tmpDir := t.TempDir()

	spmHome = filepath.Join(tmpDir, ".spm")
	cwd = filepath.Join(tmpDir, "project")

	// Create directories
	require.NoError(t, os.MkdirAll(filepath.Join(spmHome, "skills", skillName, "1.0.0"), 0o755))
	require.NoError(t, os.MkdirAll(filepath.Join(spmHome, "cache", skillName), 0o755))
	require.NoError(t, os.MkdirAll(cwd, 0o755))

	// Write a skill file
	require.NoError(t, os.WriteFile(
		filepath.Join(spmHome, "skills", skillName, "1.0.0", "skill.json"),
		[]byte(`{"name": "`+skillName+`", "version": "1.0.0"}`),
		0o644,
	))

	// Write skills.json
	sjContent, _ := json.MarshalIndent(map[string]any{
		"skills": map[string]string{skillName: "^1.0.0"},
	}, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(cwd, "skills.json"), sjContent, 0o644))

	// Write lock file
	lockContent, _ := json.MarshalIndent(map[string]any{
		"lockfileVersion": 1,
		"generated_at":    "2025-01-01T00:00:00Z",
		"generated_by":    "spm@0.0.1",
		"skills": map[string]any{
			skillName: map[string]string{
				"version":  "1.0.0",
				"resolved": "https://example.com/" + skillName + "-1.0.0.skl",
				"checksum": "abc123",
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

func TestUninstallSuccess(t *testing.T) {
	spmHome, cwd := setupUninstallTestEnv(t, "remove-me")

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	uninstallFlagKeepFiles = false

	rootCmd.SetArgs([]string{"uninstall", "remove-me"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "remove-me")
	assert.Contains(t, out, "uninstalled")

	// Verify removed from skills.json
	sjData, err := os.ReadFile(filepath.Join(cwd, "skills.json"))
	require.NoError(t, err)
	assert.NotContains(t, string(sjData), "remove-me")

	// Verify removed from lock file
	lockData, err := os.ReadFile(filepath.Join(cwd, "skills-lock.json"))
	require.NoError(t, err)
	assert.NotContains(t, string(lockData), "remove-me")

	// Verify skill files deleted
	assert.NoDirExists(t, filepath.Join(spmHome, "skills", "remove-me"))
}

func TestUninstallKeepFiles(t *testing.T) {
	spmHome, _ := setupUninstallTestEnv(t, "keep-me")

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	uninstallFlagKeepFiles = true

	rootCmd.SetArgs([]string{"uninstall", "keep-me", "--keep-files"})
	err := rootCmd.Execute()

	require.NoError(t, err)

	// Verify skill files still exist
	assert.DirExists(t, filepath.Join(spmHome, "skills", "keep-me"))
}

func TestUninstallJSONOutput(t *testing.T) {
	setupUninstallTestEnv(t, "json-remove")

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	uninstallFlagKeepFiles = false

	rootCmd.SetArgs([]string{"uninstall", "json-remove"})
	err := rootCmd.Execute()

	require.NoError(t, err)

	var result uninstallJSONOutput
	err = json.Unmarshal(buf.Bytes(), &result)
	require.NoError(t, err, "output should be valid JSON: %s", buf.String())
	assert.Equal(t, "uninstall", result.Command)
	assert.Equal(t, "success", result.Status)
	require.Len(t, result.Skills, 1)
	assert.Equal(t, "json-remove", result.Skills[0].Name)
	assert.True(t, result.Skills[0].RemovedFromJSON)
	assert.True(t, result.Skills[0].RemovedFromLock)
}

func TestUninstallMultiple(t *testing.T) {
	tmpDir := t.TempDir()
	spmHome := filepath.Join(tmpDir, ".spm")
	cwd := filepath.Join(tmpDir, "project")
	require.NoError(t, os.MkdirAll(cwd, 0o755))

	// Create two skills
	for _, name := range []string{"skill-a", "skill-b"} {
		require.NoError(t, os.MkdirAll(filepath.Join(spmHome, "skills", name, "1.0.0"), 0o755))
		require.NoError(t, os.WriteFile(
			filepath.Join(spmHome, "skills", name, "1.0.0", "skill.json"),
			[]byte(`{"name": "`+name+`"}`),
			0o644,
		))
	}

	sjContent, _ := json.MarshalIndent(map[string]any{
		"skills": map[string]string{
			"skill-a": "^1.0.0",
			"skill-b": "^1.0.0",
		},
	}, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(cwd, "skills.json"), sjContent, 0o644))

	t.Setenv("SPM_HOME", spmHome)
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(cwd))
	t.Cleanup(func() { _ = os.Chdir(origDir) })

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	uninstallFlagKeepFiles = false

	rootCmd.SetArgs([]string{"uninstall", "skill-a", "skill-b"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "skill-a")
	assert.Contains(t, out, "skill-b")

	// Both skill dirs should be gone
	assert.NoDirExists(t, filepath.Join(spmHome, "skills", "skill-a"))
	assert.NoDirExists(t, filepath.Join(spmHome, "skills", "skill-b"))
}

func TestUninstallNotInstalled(t *testing.T) {
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
	uninstallFlagKeepFiles = false

	rootCmd.SetArgs([]string{"uninstall", "ghost-skill"})
	err := rootCmd.Execute()

	// Should succeed even if skill wasn't installed (idempotent)
	require.NoError(t, err)
	assert.Contains(t, buf.String(), "ghost-skill")
}
