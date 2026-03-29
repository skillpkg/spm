package cmd

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func writeVersionManifest(t *testing.T, dir, version string) {
	t.Helper()
	m := map[string]any{
		"name":        "version-test",
		"version":     version,
		"description": "A test skill for version command testing",
		"categories":  []string{"testing"},
	}
	data, _ := json.MarshalIndent(m, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0o644))
}

func readVersionFromManifest(t *testing.T, dir string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	require.NoError(t, err)
	var m map[string]any
	require.NoError(t, json.Unmarshal(data, &m))
	v, ok := m["version"].(string)
	require.True(t, ok)
	return v
}

func TestVersionPatch(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	writeVersionManifest(t, dir, "1.2.3")

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"patch"})
	require.NoError(t, err)
	assert.Equal(t, "1.2.4", readVersionFromManifest(t, dir))
}

func TestVersionMinor(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	writeVersionManifest(t, dir, "1.2.3")

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"minor"})
	require.NoError(t, err)
	assert.Equal(t, "1.3.0", readVersionFromManifest(t, dir))
}

func TestVersionMajor(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	writeVersionManifest(t, dir, "1.2.3")

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"major"})
	require.NoError(t, err)
	assert.Equal(t, "2.0.0", readVersionFromManifest(t, dir))
}

func TestVersionExplicit(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	writeVersionManifest(t, dir, "1.0.0")

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"3.5.0"})
	require.NoError(t, err)
	assert.Equal(t, "3.5.0", readVersionFromManifest(t, dir))
}

func TestVersionInvalidInput(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	writeVersionManifest(t, dir, "1.0.0")

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"not-valid"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not a valid release type")
}

func TestVersionNoManifest(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"patch"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "manifest.json")
}

func TestVersionPreservesOtherFields(t *testing.T) {
	dir := t.TempDir()
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer func() { _ = os.Chdir(origDir) }()

	writeVersionManifest(t, dir, "1.0.0")

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runVersion(nil, []string{"patch"})
	require.NoError(t, err)

	data, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	require.NoError(t, err)
	var m map[string]any
	require.NoError(t, json.Unmarshal(data, &m))
	assert.Equal(t, "1.0.1", m["version"])
	assert.Equal(t, "version-test", m["name"])
}
