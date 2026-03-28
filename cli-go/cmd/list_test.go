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

func writeTestFile(t *testing.T, dir, name, content string) {
	t.Helper()
	err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644)
	require.NoError(t, err)
}

func TestListHumanOutput(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", t.TempDir())

	writeTestFile(t, tmpDir, "skills.json", `{
		"skills": {
			"code-review": "^1.0.0",
			"test-gen": "~2.0.0"
		}
	}`)

	writeTestFile(t, tmpDir, "skills-lock.json", `{
		"lockfileVersion": 1,
		"generated_at": "2026-03-01T00:00:00Z",
		"generated_by": "spm@0.0.1",
		"skills": {
			"code-review": {
				"version": "1.2.0",
				"resolved": "https://registry.skillpkg.dev/dl/code-review-1.2.0.skl",
				"checksum": "sha256:abc123",
				"source": "registry",
				"signer": "alice@github.com"
			},
			"test-gen": {
				"version": "2.0.3",
				"resolved": "https://registry.skillpkg.dev/dl/test-gen-2.0.3.skl",
				"checksum": "sha256:def456",
				"source": "registry"
			}
		}
	}`)

	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(tmpDir))
	defer os.Chdir(origDir)

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"list"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "code-review")
	assert.Contains(t, out, "1.2.0")
	assert.Contains(t, out, "test-gen")
	assert.Contains(t, out, "2.0.3")
	assert.Contains(t, out, "alice@github.com")
	assert.Contains(t, out, "2 skills installed")
}

func TestListJSONOutput(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", t.TempDir())

	writeTestFile(t, tmpDir, "skills.json", `{
		"skills": {
			"my-skill": "^1.0.0"
		}
	}`)

	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(tmpDir))
	defer os.Chdir(origDir)

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"list"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()

	var result map[string]any
	err = json.Unmarshal([]byte(out), &result)
	require.NoError(t, err, "output should be valid JSON")
	assert.Equal(t, float64(1), result["total"])
}

func TestListNoSkillsInstalled(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", t.TempDir())

	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(tmpDir))
	defer os.Chdir(origDir)

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"list"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "No skills installed")
	assert.Contains(t, out, "spm install <name>")
}

func TestListEmptySkillsJson(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", t.TempDir())

	writeTestFile(t, tmpDir, "skills.json", `{"skills": {}}`)

	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(tmpDir))
	defer os.Chdir(origDir)

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"list"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "No skills installed")
}

func TestListNoLockFile(t *testing.T) {
	tmpDir := t.TempDir()
	t.Setenv("SPM_HOME", t.TempDir())

	writeTestFile(t, tmpDir, "skills.json", `{
		"skills": {
			"some-skill": "^1.0.0"
		}
	}`)

	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(tmpDir))
	defer os.Chdir(origDir)

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"list"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "some-skill")
	assert.Contains(t, out, "1 skill installed")
}
