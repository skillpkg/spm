package linker

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupTestLinker creates a Linker with agent dirs under the given temp directory.
func setupTestLinker(t *testing.T) (*Linker, string) {
	t.Helper()
	homeDir := t.TempDir()
	return NewDefault(homeDir), homeDir
}

// createSkillDir creates a fake skill directory with a manifest and readme.
func createSkillDir(t *testing.T) string {
	t.Helper()
	skillDir := filepath.Join(t.TempDir(), "my-skill")
	require.NoError(t, os.MkdirAll(skillDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(skillDir, "manifest.json"), []byte(`{"name":"my-skill"}`), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(skillDir, "SKILL.md"), []byte("# My Skill"), 0o644))
	return skillDir
}

func TestLinkSkill_CreatesSymlinks(t *testing.T) {
	linker, homeDir := setupTestLinker(t)
	skillDir := createSkillDir(t)

	result, err := linker.LinkSkill(skillDir, "my-skill")
	require.NoError(t, err)
	assert.Equal(t, "symlink", result.Method)
	assert.False(t, result.IsCopy)
	assert.Len(t, result.Agents, 3) // Claude Code, Cursor, Codex

	// Verify symlinks exist
	for _, agent := range linker.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, "my-skill")
		linkTarget, err := os.Readlink(targetDir)
		require.NoError(t, err, "symlink should exist for %s", agent.Name)
		assert.Equal(t, skillDir, linkTarget)
	}

	// Verify file content is accessible via symlink
	content, err := os.ReadFile(filepath.Join(homeDir, ".claude", "skills", "my-skill", "SKILL.md"))
	require.NoError(t, err)
	assert.Equal(t, "# My Skill", string(content))
}

func TestLinkSkill_IdempotentSymlink(t *testing.T) {
	linker, _ := setupTestLinker(t)
	skillDir := createSkillDir(t)

	// Link twice
	result1, err := linker.LinkSkill(skillDir, "my-skill")
	require.NoError(t, err)
	result2, err := linker.LinkSkill(skillDir, "my-skill")
	require.NoError(t, err)

	assert.Equal(t, result1.Method, result2.Method)
	assert.Equal(t, len(result1.Agents), len(result2.Agents))
}

func TestLinkSkill_ReplacesStaleSymlink(t *testing.T) {
	linker, _ := setupTestLinker(t)
	skillDir1 := createSkillDir(t)
	skillDir2 := createSkillDir(t)

	// Link to first skill
	_, err := linker.LinkSkill(skillDir1, "my-skill")
	require.NoError(t, err)

	// Link to second skill (should replace)
	_, err = linker.LinkSkill(skillDir2, "my-skill")
	require.NoError(t, err)

	// Verify it now points to skillDir2
	for _, agent := range linker.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, "my-skill")
		linkTarget, err := os.Readlink(targetDir)
		require.NoError(t, err)
		assert.Equal(t, skillDir2, linkTarget)
	}
}

func TestUnlinkSkill_RemovesSymlinks(t *testing.T) {
	linker, _ := setupTestLinker(t)
	skillDir := createSkillDir(t)

	_, err := linker.LinkSkill(skillDir, "my-skill")
	require.NoError(t, err)

	unlinked, err := linker.UnlinkSkill("my-skill")
	require.NoError(t, err)
	assert.Len(t, unlinked, 3)

	// Verify symlinks are gone
	for _, agent := range linker.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, "my-skill")
		_, err := os.Lstat(targetDir)
		assert.True(t, os.IsNotExist(err), "symlink should be removed from %s", agent.Name)
	}
}

func TestUnlinkSkill_MissingDirsGraceful(t *testing.T) {
	linker, _ := setupTestLinker(t)

	// Unlink without ever linking — should not error
	unlinked, err := linker.UnlinkSkill("nonexistent")
	require.NoError(t, err)
	assert.Empty(t, unlinked)
}

func TestUnlinkSkill_RemovesCopies(t *testing.T) {
	linker, _ := setupTestLinker(t)

	// Manually create a "copy" (directory, not symlink)
	for _, agent := range linker.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, "copied-skill")
		require.NoError(t, os.MkdirAll(targetDir, 0o755))
		require.NoError(t, os.WriteFile(filepath.Join(targetDir, "SKILL.md"), []byte("test"), 0o644))
	}

	unlinked, err := linker.UnlinkSkill("copied-skill")
	require.NoError(t, err)
	assert.Len(t, unlinked, 3)

	for _, agent := range linker.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, "copied-skill")
		_, err := os.Stat(targetDir)
		assert.True(t, os.IsNotExist(err))
	}
}

func TestGetLinkedAgents_Linked(t *testing.T) {
	linker, _ := setupTestLinker(t)
	skillDir := createSkillDir(t)

	_, err := linker.LinkSkill(skillDir, "my-skill")
	require.NoError(t, err)

	agents := linker.GetLinkedAgents("my-skill")
	assert.Len(t, agents, 3)
	assert.Contains(t, agents, "Claude Code")
	assert.Contains(t, agents, "Cursor")
	assert.Contains(t, agents, "Codex")
}

func TestGetLinkedAgents_NotLinked(t *testing.T) {
	linker, _ := setupTestLinker(t)

	agents := linker.GetLinkedAgents("nonexistent")
	assert.Empty(t, agents)
}

func TestGetLinkedAgents_PartiallyLinked(t *testing.T) {
	linker, _ := setupTestLinker(t)
	skillDir := createSkillDir(t)

	// Only create symlink in Claude dir
	claudeDir := filepath.Join(linker.AgentDirs[0].SkillsDir, "my-skill")
	require.NoError(t, os.MkdirAll(filepath.Dir(claudeDir), 0o755))
	require.NoError(t, os.Symlink(skillDir, claudeDir))

	agents := linker.GetLinkedAgents("my-skill")
	assert.Len(t, agents, 1)
	assert.Equal(t, "Claude Code", agents[0])
}

func TestIsSkillCopy_Symlink(t *testing.T) {
	linker, _ := setupTestLinker(t)
	skillDir := createSkillDir(t)

	_, err := linker.LinkSkill(skillDir, "my-skill")
	require.NoError(t, err)

	assert.False(t, linker.IsSkillCopy("my-skill"))
}

func TestIsSkillCopy_Copy(t *testing.T) {
	linker, _ := setupTestLinker(t)

	// Manually create a copy
	targetDir := filepath.Join(linker.AgentDirs[0].SkillsDir, "copied-skill")
	require.NoError(t, os.MkdirAll(targetDir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(targetDir, "SKILL.md"), []byte("test"), 0o644))

	assert.True(t, linker.IsSkillCopy("copied-skill"))
}

func TestIsSkillCopy_NotFound(t *testing.T) {
	linker, _ := setupTestLinker(t)
	assert.False(t, linker.IsSkillCopy("nonexistent"))
}

func TestLinkSkill_CopyFallback(t *testing.T) {
	// Create a linker that points to agent dirs where symlinks will fail.
	// We simulate this by using a custom linker that creates the agents dir
	// but the skill source is on the same filesystem, so symlinks should work.
	// Instead, test the copy logic directly.
	homeDir := t.TempDir()
	skillDir := createSkillDir(t)

	targetDir := filepath.Join(homeDir, "test-agent", "skills", "my-skill")
	err := tryCopy(skillDir, targetDir)
	require.NoError(t, err)

	// Verify files were copied
	content, err := os.ReadFile(filepath.Join(targetDir, "SKILL.md"))
	require.NoError(t, err)
	assert.Equal(t, "# My Skill", string(content))

	content, err = os.ReadFile(filepath.Join(targetDir, "manifest.json"))
	require.NoError(t, err)
	assert.Contains(t, string(content), "my-skill")
}

func TestDefaultAgentDirs(t *testing.T) {
	dirs := DefaultAgentDirs("/home/testuser")
	require.Len(t, dirs, 3)
	assert.Equal(t, "Claude Code", dirs[0].Name)
	assert.Equal(t, "/home/testuser/.claude/skills", dirs[0].SkillsDir)
	assert.Equal(t, "Cursor", dirs[1].Name)
	assert.Equal(t, "/home/testuser/.cursor/skills", dirs[1].SkillsDir)
	assert.Equal(t, "Codex", dirs[2].Name)
	assert.Equal(t, "/home/testuser/.agents/skills", dirs[2].SkillsDir)
}
