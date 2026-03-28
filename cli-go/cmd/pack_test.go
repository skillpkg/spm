package cmd

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupPackSkillDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	m := map[string]any{
		"name":        "pack-test",
		"version":     "1.0.0",
		"description": "A skill used for testing the pack command behavior",
		"categories":  []string{"testing"},
		"license":     "MIT",
	}
	data, _ := json.MarshalIndent(m, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte("# Pack Test\n\nTest skill."), 0o644))

	return dir
}

func listTarGzFiles(t *testing.T, archivePath string) []string {
	t.Helper()
	f, err := os.Open(archivePath)
	require.NoError(t, err)
	defer f.Close()

	gz, err := gzip.NewReader(f)
	require.NoError(t, err)
	defer gz.Close()

	tr := tar.NewReader(gz)
	var files []string
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
		files = append(files, hdr.Name)
	}
	return files
}

func TestPackCreatesSklFile(t *testing.T) {
	dir := setupPackSkillDir(t)
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer os.Chdir(origDir)

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runPack(nil, []string{dir})
	require.NoError(t, err)

	archivePath := filepath.Join(dir, "pack-test-1.0.0.skl")
	assert.FileExists(t, archivePath)

	// Verify size > 0
	info, err := os.Stat(archivePath)
	require.NoError(t, err)
	assert.Greater(t, info.Size(), int64(0))
}

func TestPackContainsExpectedFiles(t *testing.T) {
	dir := setupPackSkillDir(t)
	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer os.Chdir(origDir)

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runPack(nil, []string{dir})
	require.NoError(t, err)

	archivePath := filepath.Join(dir, "pack-test-1.0.0.skl")
	files := listTarGzFiles(t, archivePath)

	assert.Contains(t, files, "manifest.json")
	assert.Contains(t, files, "SKILL.md")
}

func TestPackInvalidManifestBlocks(t *testing.T) {
	dir := t.TempDir()

	// Write invalid manifest (no description)
	m := map[string]any{
		"name":    "bad",
		"version": "1.0.0",
	}
	data, _ := json.MarshalIndent(m, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0o644))

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runPack(nil, []string{dir})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "validation failed")
}

func TestPackNoManifest(t *testing.T) {
	dir := t.TempDir()

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runPack(nil, []string{dir})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "manifest.json")
}

func TestPackIncludesScripts(t *testing.T) {
	dir := setupPackSkillDir(t)

	// Add a scripts directory with a file
	scriptsDir := filepath.Join(dir, "scripts")
	require.NoError(t, os.MkdirAll(scriptsDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(scriptsDir, "run.sh"), []byte("#!/bin/bash\necho hi"), 0o644))

	origDir, _ := os.Getwd()
	require.NoError(t, os.Chdir(dir))
	defer os.Chdir(origDir)

	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runPack(nil, []string{dir})
	require.NoError(t, err)

	archivePath := filepath.Join(dir, "pack-test-1.0.0.skl")
	files := listTarGzFiles(t, archivePath)

	assert.Contains(t, files, filepath.Join("scripts", "run.sh"))
}

func TestFormatBytes(t *testing.T) {
	assert.Equal(t, "0 B", formatBytes(0))
	assert.Equal(t, "500 B", formatBytes(500))
	assert.Equal(t, "1.0 KB", formatBytes(1024))
	assert.Equal(t, "1.5 KB", formatBytes(1536))
	assert.Equal(t, "1.0 MB", formatBytes(1024*1024))
}
