package preflight

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestDirs(t *testing.T) ([]AgentDir, string) {
	t.Helper()
	homeDir := t.TempDir()
	dirs := DefaultAgentDirs(homeDir)

	// Create all agent skills directories
	for _, d := range dirs {
		require.NoError(t, os.MkdirAll(d.SkillsDir, 0o755))
	}

	return dirs, homeDir
}

func TestScan_NoIssues(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	// Create healthy symlinks
	skillDir := filepath.Join(t.TempDir(), "healthy-skill")
	require.NoError(t, os.MkdirAll(skillDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(skillDir, "SKILL.md"), []byte("ok"), 0o644))

	for _, d := range dirs {
		require.NoError(t, os.Symlink(skillDir, filepath.Join(d.SkillsDir, "healthy-skill")))
	}

	report, err := Scan(dirs, false)
	require.NoError(t, err)
	assert.Empty(t, report.Issues)
	assert.Equal(t, 0, report.Found)
	assert.Equal(t, 0, report.Removed)
	assert.Equal(t, 3, report.Healthy) // 3 agents, each with 1 healthy link
}

func TestScan_DetectsBrokenSymlinks(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	// Create broken symlinks (pointing to non-existent target)
	for _, d := range dirs {
		require.NoError(t, os.Symlink("/nonexistent/path/to/skill", filepath.Join(d.SkillsDir, "broken-skill")))
	}

	report, err := Scan(dirs, false)
	require.NoError(t, err)
	assert.Len(t, report.Issues, 3)
	assert.Equal(t, 3, report.Found)
	assert.Equal(t, 0, report.Removed) // autoRepair is false
	assert.Equal(t, 0, report.Healthy)

	for _, issue := range report.Issues {
		assert.Equal(t, BrokenSymlink, issue.Type)
		assert.Equal(t, "broken-skill", issue.SkillName)
		assert.False(t, issue.Fixed)
		assert.Contains(t, issue.Detail, "Symlink target missing")
	}
}

func TestScan_AutoRepairBrokenSymlinks(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	// Create broken symlinks
	for _, d := range dirs {
		require.NoError(t, os.Symlink("/nonexistent/path", filepath.Join(d.SkillsDir, "broken-skill")))
	}

	report, err := Scan(dirs, true)
	require.NoError(t, err)
	assert.Len(t, report.Issues, 3)
	assert.Equal(t, 3, report.Found)
	assert.Equal(t, 3, report.Removed)

	for _, issue := range report.Issues {
		assert.True(t, issue.Fixed)
	}

	// Verify symlinks are actually removed
	for _, d := range dirs {
		_, err := os.Lstat(filepath.Join(d.SkillsDir, "broken-skill"))
		assert.True(t, os.IsNotExist(err))
	}
}

func TestScan_MixedHealthyAndBroken(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	// Create a healthy skill directory
	healthyDir := filepath.Join(t.TempDir(), "healthy-skill")
	require.NoError(t, os.MkdirAll(healthyDir, 0o755))

	// In first agent dir: healthy symlink
	require.NoError(t, os.Symlink(healthyDir, filepath.Join(dirs[0].SkillsDir, "healthy-skill")))

	// In first agent dir: broken symlink
	require.NoError(t, os.Symlink("/nonexistent", filepath.Join(dirs[0].SkillsDir, "broken-skill")))

	report, err := Scan(dirs, false)
	require.NoError(t, err)
	assert.Equal(t, 1, report.Found)
	assert.Equal(t, 1, report.Healthy)
	assert.Len(t, report.Issues, 1)
	assert.Equal(t, "broken-skill", report.Issues[0].SkillName)
	assert.Equal(t, "Claude Code", report.Issues[0].Agent)
}

func TestScan_SkipsHealthyCopies(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	// Create a copy (regular directory, not symlink)
	copyDir := filepath.Join(dirs[0].SkillsDir, "copied-skill")
	require.NoError(t, os.MkdirAll(copyDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(copyDir, "SKILL.md"), []byte("ok"), 0o644))

	report, err := Scan(dirs, false)
	require.NoError(t, err)
	assert.Empty(t, report.Issues)
	assert.Equal(t, 0, report.Found)
	assert.Equal(t, 1, report.Healthy) // copy is considered healthy
}

func TestScan_MissingAgentDirsGraceful(t *testing.T) {
	// Don't create agent dirs — should not error
	homeDir := t.TempDir()
	dirs := DefaultAgentDirs(homeDir)

	report, err := Scan(dirs, false)
	require.NoError(t, err)
	assert.Empty(t, report.Issues)
	assert.Equal(t, 0, report.Found)
	assert.Equal(t, 0, report.Healthy)
}

func TestScan_EmptyAgentDirs(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	report, err := Scan(dirs, false)
	require.NoError(t, err)
	assert.Empty(t, report.Issues)
	assert.Equal(t, 0, report.Found)
	assert.Equal(t, 0, report.Healthy)
}

func TestScanDefault(t *testing.T) {
	homeDir := t.TempDir()

	report, err := ScanDefault(homeDir, false)
	require.NoError(t, err)
	assert.NotNil(t, report)
	assert.Empty(t, report.Issues)
}

func TestDefaultAgentDirs(t *testing.T) {
	dirs := DefaultAgentDirs("/home/testuser")
	require.Len(t, dirs, 3)
	assert.Equal(t, "Claude Code", dirs[0].Name)
	assert.Equal(t, "/home/testuser/.claude/skills", dirs[0].SkillsDir)
}

func TestScan_ReportCounts(t *testing.T) {
	dirs, _ := setupTestDirs(t)

	healthyDir := filepath.Join(t.TempDir(), "healthy")
	require.NoError(t, os.MkdirAll(healthyDir, 0o755))

	// 2 healthy, 1 broken in first agent dir
	require.NoError(t, os.Symlink(healthyDir, filepath.Join(dirs[0].SkillsDir, "healthy1")))
	require.NoError(t, os.Symlink(healthyDir, filepath.Join(dirs[0].SkillsDir, "healthy2")))
	require.NoError(t, os.Symlink("/gone", filepath.Join(dirs[0].SkillsDir, "broken1")))

	report, err := Scan(dirs, true)
	require.NoError(t, err)
	assert.Equal(t, 1, report.Found)
	assert.Equal(t, 1, report.Removed)
	assert.Equal(t, 2, report.Healthy)
}
