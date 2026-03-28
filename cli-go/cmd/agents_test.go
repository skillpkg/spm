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

func TestAgentsHumanOutput(t *testing.T) {
	t.Setenv("SPM_HOME", t.TempDir())
	tmpDir := t.TempDir()

	// Create a fake agent directory with some skills
	claudeSkillsDir := filepath.Join(tmpDir, ".claude", "skills")
	require.NoError(t, os.MkdirAll(filepath.Join(claudeSkillsDir, "code-review"), 0o755))
	require.NoError(t, os.MkdirAll(filepath.Join(claudeSkillsDir, "test-gen"), 0o755))

	// Create another agent dir but empty
	cursorSkillsDir := filepath.Join(tmpDir, ".cursor", "skills")
	require.NoError(t, os.MkdirAll(cursorSkillsDir, 0o755))

	origFunc := knownAgentsFunc
	knownAgentsFunc = func() []agentDef {
		return []agentDef{
			{Name: "Claude Code", Dir: claudeSkillsDir},
			{Name: "Cursor", Dir: cursorSkillsDir},
			{Name: "Codex", Dir: filepath.Join(tmpDir, ".agents", "skills")},
		}
	}
	defer func() { knownAgentsFunc = origFunc }()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"agents"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "Claude Code")
	assert.Contains(t, out, "2 skills linked")
	assert.Contains(t, out, "Cursor")
	assert.Contains(t, out, "0 skills linked")
	assert.Contains(t, out, "not detected")
}

func TestAgentsJSONOutput(t *testing.T) {
	t.Setenv("SPM_HOME", t.TempDir())
	tmpDir := t.TempDir()

	claudeSkillsDir := filepath.Join(tmpDir, ".claude", "skills")
	require.NoError(t, os.MkdirAll(filepath.Join(claudeSkillsDir, "my-skill"), 0o755))

	origFunc := knownAgentsFunc
	knownAgentsFunc = func() []agentDef {
		return []agentDef{
			{Name: "Claude Code", Dir: claudeSkillsDir},
			{Name: "Cursor", Dir: filepath.Join(tmpDir, ".cursor", "skills")},
		}
	}
	defer func() { knownAgentsFunc = origFunc }()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"agents"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()

	var results []map[string]any
	err = json.Unmarshal([]byte(out), &results)
	require.NoError(t, err, "output should be valid JSON array")
	assert.Len(t, results, 2)

	assert.Equal(t, "Claude Code", results[0]["name"])
	assert.Equal(t, true, results[0]["detected"])
	assert.Equal(t, float64(1), results[0]["skill_count"])

	assert.Equal(t, false, results[1]["detected"])
}

func TestAgentsNoAgentsDetected(t *testing.T) {
	t.Setenv("SPM_HOME", t.TempDir())
	tmpDir := t.TempDir()

	origFunc := knownAgentsFunc
	knownAgentsFunc = func() []agentDef {
		return []agentDef{
			{Name: "Claude Code", Dir: filepath.Join(tmpDir, ".claude", "skills")},
			{Name: "Cursor", Dir: filepath.Join(tmpDir, ".cursor", "skills")},
		}
	}
	defer func() { knownAgentsFunc = origFunc }()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"agents"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "No agents detected")
	assert.Contains(t, out, "Install an AI agent")
}

func TestAgentsDetectedNoSkills(t *testing.T) {
	t.Setenv("SPM_HOME", t.TempDir())
	tmpDir := t.TempDir()

	claudeDir := filepath.Join(tmpDir, ".claude", "skills")
	require.NoError(t, os.MkdirAll(claudeDir, 0o755))

	origFunc := knownAgentsFunc
	knownAgentsFunc = func() []agentDef {
		return []agentDef{
			{Name: "Claude Code", Dir: claudeDir},
		}
	}
	defer func() { knownAgentsFunc = origFunc }()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}

	rootCmd.SetArgs([]string{"agents"})
	err := rootCmd.Execute()

	require.NoError(t, err)
	out := buf.String()
	assert.Contains(t, out, "1 agent detected, no skills linked yet")
}
