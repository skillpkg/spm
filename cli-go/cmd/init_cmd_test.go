package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/skillpkg/spm/internal/manifest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitCreatesFiles(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	// Reset flags
	initName = "test-skill"
	initVersion = "0.1.0"
	initDescription = "A test skill for verifying initialization works correctly"
	initCategory = "testing"
	initAuthor = "tester"
	initLicense = "MIT"

	err := runInit(nil, nil)
	require.NoError(t, err)

	// manifest.json exists and is valid
	m, err := manifest.LoadFile(filepath.Join(dir, "manifest.json"))
	require.NoError(t, err)
	assert.Equal(t, "test-skill", m.Name)
	assert.Equal(t, "0.1.0", m.Version)
	assert.Equal(t, []string{"testing"}, m.Categories)
	assert.Equal(t, "MIT", m.License)
	require.Len(t, m.Authors, 1)
	assert.Equal(t, "tester", m.Authors[0].Name)

	// Validate manifest
	assert.NoError(t, manifest.Validate(m))

	// SKILL.md exists
	skillMD, err := os.ReadFile(filepath.Join(dir, "SKILL.md"))
	require.NoError(t, err)
	assert.Contains(t, string(skillMD), "# test-skill")

	// tests/eval.json exists
	evalData, err := os.ReadFile(filepath.Join(dir, "tests", "eval.json"))
	require.NoError(t, err)
	var evalFile map[string]any
	require.NoError(t, json.Unmarshal(evalData, &evalFile))
	assert.Contains(t, evalFile, "tests")
}

func TestInitDefaultsFromDir(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	// No name flag set, should derive from dir
	initName = ""
	initVersion = "0.1.0"
	initDescription = "A skill initialized with defaults for testing"
	initCategory = "other"
	initAuthor = ""
	initLicense = "MIT"

	err := runInit(nil, nil)
	require.NoError(t, err)

	m, err := manifest.LoadFile(filepath.Join(dir, "manifest.json"))
	require.NoError(t, err)
	assert.NotEmpty(t, m.Name)
	assert.Equal(t, "0.1.0", m.Version)
}

func TestInitInvalidCategory(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	initName = "test-skill"
	initVersion = "0.1.0"
	initDescription = "A test skill with an invalid category value"
	initCategory = "not-a-category"
	initAuthor = ""
	initLicense = "MIT"

	err := runInit(nil, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid category")
}

func TestDirToKebab(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"my-skill", "my-skill"},
		{"MySkill", "myskill"},
		{"My Skill", "my-skill"},
		{"123", "my-skill"}, // starts with digit
		{"-foo", "foo"},     // starts with dash, trimmed to "foo" (valid)
		{"ab", "ab"},        // minimum length
		{"a", "my-skill"},   // too short after trim
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			assert.Equal(t, tt.expected, dirToKebab(tt.input))
		})
	}
}
