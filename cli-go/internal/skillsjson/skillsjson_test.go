package skillsjson

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadSkillsJson_ValidFile(t *testing.T) {
	dir := t.TempDir()
	content := `{"skills":{"code-review":"^1.0.0","test-gen":"~2.0.0"}}`
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsJsonFile), []byte(content), 0o644))

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	require.NotNil(t, sj)
	assert.Equal(t, "^1.0.0", sj.Skills["code-review"])
	assert.Equal(t, "~2.0.0", sj.Skills["test-gen"])
	assert.Len(t, sj.Skills, 2)
}

func TestLoadSkillsJson_MissingFile(t *testing.T) {
	dir := t.TempDir()
	sj, err := LoadSkillsJson(dir)
	assert.NoError(t, err)
	assert.Nil(t, sj)
}

func TestLoadSkillsJson_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsJsonFile), []byte("not json"), 0o644))

	sj, err := LoadSkillsJson(dir)
	assert.Error(t, err)
	assert.Nil(t, sj)
	assert.Contains(t, err.Error(), "parsing")
}

func TestLoadSkillsJson_EmptySkills(t *testing.T) {
	dir := t.TempDir()
	content := `{"skills":{}}`
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsJsonFile), []byte(content), 0o644))

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	require.NotNil(t, sj)
	assert.Empty(t, sj.Skills)
}

func TestLoadSkillsJson_NullSkills(t *testing.T) {
	dir := t.TempDir()
	content := `{"skills":null}`
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsJsonFile), []byte(content), 0o644))

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	require.NotNil(t, sj)
	assert.NotNil(t, sj.Skills) // should be initialized to empty map
}

func TestSaveSkillsJson(t *testing.T) {
	dir := t.TempDir()
	sj := &SkillsJson{
		Skills: map[string]string{
			"my-skill": "^1.0.0",
		},
	}

	err := SaveSkillsJson(dir, sj)
	require.NoError(t, err)

	data, err := os.ReadFile(filepath.Join(dir, SkillsJsonFile))
	require.NoError(t, err)

	var loaded SkillsJson
	require.NoError(t, json.Unmarshal(data, &loaded))
	assert.Equal(t, "^1.0.0", loaded.Skills["my-skill"])
}

func TestSaveSkillsJson_CreatesDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "dir")
	sj := &SkillsJson{Skills: map[string]string{"a": "1.0.0"}}

	err := SaveSkillsJson(dir, sj)
	require.NoError(t, err)

	_, err = os.Stat(filepath.Join(dir, SkillsJsonFile))
	assert.NoError(t, err)
}

func TestRoundTrip_SkillsJson(t *testing.T) {
	dir := t.TempDir()
	original := &SkillsJson{
		Skills: map[string]string{
			"code-review":         "^1.0.0",
			"test-generator":      "~2.1.0",
			"@acme/deploy-helper": ">=0.5.0",
		},
	}

	require.NoError(t, SaveSkillsJson(dir, original))

	loaded, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, original.Skills, loaded.Skills)
}

func TestAddSkill_NewFile(t *testing.T) {
	dir := t.TempDir()

	err := AddSkill(dir, "new-skill", "^1.0.0")
	require.NoError(t, err)

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	require.NotNil(t, sj)
	assert.Equal(t, "^1.0.0", sj.Skills["new-skill"])
}

func TestAddSkill_ExistingFile(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, AddSkill(dir, "existing", "^1.0.0"))

	require.NoError(t, AddSkill(dir, "another", "~2.0.0"))

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	assert.Equal(t, "^1.0.0", sj.Skills["existing"])
	assert.Equal(t, "~2.0.0", sj.Skills["another"])
}

func TestAddSkill_UpdateExisting(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, AddSkill(dir, "my-skill", "^1.0.0"))
	require.NoError(t, AddSkill(dir, "my-skill", "^2.0.0"))

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	assert.Equal(t, "^2.0.0", sj.Skills["my-skill"])
}

func TestRemoveSkill_Exists(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, AddSkill(dir, "to-remove", "^1.0.0"))
	require.NoError(t, AddSkill(dir, "to-keep", "^2.0.0"))

	removed, err := RemoveSkill(dir, "to-remove")
	require.NoError(t, err)
	assert.True(t, removed)

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	assert.NotContains(t, sj.Skills, "to-remove")
	assert.Equal(t, "^2.0.0", sj.Skills["to-keep"])
}

func TestRemoveSkill_NotFound(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, AddSkill(dir, "other", "^1.0.0"))

	removed, err := RemoveSkill(dir, "nonexistent")
	require.NoError(t, err)
	assert.False(t, removed)
}

func TestRemoveSkill_NoFile(t *testing.T) {
	dir := t.TempDir()

	removed, err := RemoveSkill(dir, "anything")
	require.NoError(t, err)
	assert.False(t, removed)
}

// ── Lock file tests ──

func TestLoadLockFile_ValidFile(t *testing.T) {
	dir := t.TempDir()
	lock := SkillsLock{
		LockfileVersion: 1,
		GeneratedAt:     "2025-01-15T10:30:00Z",
		GeneratedBy:     "spm@0.0.1",
		Skills: map[string]LockEntry{
			"code-review": {
				Version:  "1.2.3",
				Resolved: "https://registry.skillpkg.dev/skills/code-review/1.2.3/download",
				Checksum: "sha256:abc123",
				Source:   "registry",
			},
		},
	}
	data, _ := json.MarshalIndent(lock, "", "  ")
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsLockFile), data, 0o644))

	loaded, err := LoadLockFile(dir)
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, 1, loaded.LockfileVersion)
	assert.Equal(t, "1.2.3", loaded.Skills["code-review"].Version)
	assert.Equal(t, "sha256:abc123", loaded.Skills["code-review"].Checksum)
}

func TestLoadLockFile_MissingFile(t *testing.T) {
	dir := t.TempDir()
	lock, err := LoadLockFile(dir)
	assert.NoError(t, err)
	assert.Nil(t, lock)
}

func TestLoadLockFile_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsLockFile), []byte("{bad"), 0o644))

	lock, err := LoadLockFile(dir)
	assert.Error(t, err)
	assert.Nil(t, lock)
}

func TestRoundTrip_LockFile(t *testing.T) {
	dir := t.TempDir()
	original := &SkillsLock{
		LockfileVersion: 1,
		GeneratedAt:     "2025-01-15T10:30:00Z",
		GeneratedBy:     "spm@0.0.1",
		Skills: map[string]LockEntry{
			"code-review": {
				Version:  "1.2.3",
				Resolved: "https://registry.skillpkg.dev/skills/code-review/1.2.3/download",
				Checksum: "sha256:abc123",
				Source:   "registry",
			},
			"test-gen": {
				Version:  "2.1.5",
				Resolved: "https://registry.skillpkg.dev/skills/test-gen/2.1.5/download",
				Checksum: "sha256:def456",
				Source:   "registry",
				Signer:   "github:testuser",
			},
		},
	}

	require.NoError(t, SaveLockFile(dir, original))

	loaded, err := LoadLockFile(dir)
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, original.LockfileVersion, loaded.LockfileVersion)
	assert.Equal(t, original.GeneratedAt, loaded.GeneratedAt)
	assert.Equal(t, original.GeneratedBy, loaded.GeneratedBy)
	assert.Equal(t, original.Skills["code-review"], loaded.Skills["code-review"])
	assert.Equal(t, original.Skills["test-gen"], loaded.Skills["test-gen"])
}

func TestUpdateLockFile_NewFile(t *testing.T) {
	dir := t.TempDir()

	resolved := []ResolvedSkill{
		{
			Name:        "my-skill",
			Version:     "1.0.0",
			DownloadURL: "https://example.com/download",
			Checksum:    "sha256:abc",
		},
	}

	err := UpdateLockFile(dir, resolved)
	require.NoError(t, err)

	lock, err := LoadLockFile(dir)
	require.NoError(t, err)
	require.NotNil(t, lock)
	assert.Equal(t, LockVersion, lock.LockfileVersion)
	assert.Equal(t, "1.0.0", lock.Skills["my-skill"].Version)
	assert.Equal(t, "registry", lock.Skills["my-skill"].Source)
}

func TestUpdateLockFile_MergePreservesExisting(t *testing.T) {
	dir := t.TempDir()

	// First, add an entry
	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{Name: "existing", Version: "1.0.0", DownloadURL: "https://example.com/a", Checksum: "sha256:aaa"},
	}))

	// Then, add a new one (should preserve "existing")
	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{Name: "new-skill", Version: "2.0.0", DownloadURL: "https://example.com/b", Checksum: "sha256:bbb"},
	}))

	lock, err := LoadLockFile(dir)
	require.NoError(t, err)
	assert.Contains(t, lock.Skills, "existing")
	assert.Contains(t, lock.Skills, "new-skill")
	assert.Equal(t, "1.0.0", lock.Skills["existing"].Version)
	assert.Equal(t, "2.0.0", lock.Skills["new-skill"].Version)
}

func TestUpdateLockFile_OverwritesUpdated(t *testing.T) {
	dir := t.TempDir()

	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{Name: "my-skill", Version: "1.0.0", DownloadURL: "https://example.com/a", Checksum: "sha256:old"},
	}))

	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{Name: "my-skill", Version: "2.0.0", DownloadURL: "https://example.com/b", Checksum: "sha256:new"},
	}))

	lock, err := LoadLockFile(dir)
	require.NoError(t, err)
	assert.Equal(t, "2.0.0", lock.Skills["my-skill"].Version)
	assert.Equal(t, "sha256:new", lock.Skills["my-skill"].Checksum)
}

func TestUpdateLockFile_WithSigner(t *testing.T) {
	dir := t.TempDir()

	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{
			Name:        "signed-skill",
			Version:     "1.0.0",
			DownloadURL: "https://example.com/dl",
			Checksum:    "sha256:signed",
			Signed:      true,
			Signer:      "github:publisher",
		},
	}))

	lock, err := LoadLockFile(dir)
	require.NoError(t, err)
	assert.Equal(t, "github:publisher", lock.Skills["signed-skill"].Signer)
}

func TestRemoveFromLockFile_Exists(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{Name: "to-remove", Version: "1.0.0", DownloadURL: "https://example.com/a", Checksum: "sha256:aaa"},
		{Name: "to-keep", Version: "2.0.0", DownloadURL: "https://example.com/b", Checksum: "sha256:bbb"},
	}))

	removed, err := RemoveFromLockFile(dir, "to-remove")
	require.NoError(t, err)
	assert.True(t, removed)

	lock, err := LoadLockFile(dir)
	require.NoError(t, err)
	assert.NotContains(t, lock.Skills, "to-remove")
	assert.Contains(t, lock.Skills, "to-keep")
}

func TestRemoveFromLockFile_NotFound(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, UpdateLockFile(dir, []ResolvedSkill{
		{Name: "other", Version: "1.0.0", DownloadURL: "https://example.com/a", Checksum: "sha256:aaa"},
	}))

	removed, err := RemoveFromLockFile(dir, "nonexistent")
	require.NoError(t, err)
	assert.False(t, removed)
}

func TestRemoveFromLockFile_NoFile(t *testing.T) {
	dir := t.TempDir()

	removed, err := RemoveFromLockFile(dir, "anything")
	require.NoError(t, err)
	assert.False(t, removed)
}

func TestLoadSkillsJson_FromFixture(t *testing.T) {
	// Copy fixture to temp dir with expected filename
	dir := t.TempDir()
	data, err := os.ReadFile("../../testdata/skills-json/valid.json")
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsJsonFile), data, 0o644))

	sj, err := LoadSkillsJson(dir)
	require.NoError(t, err)
	require.NotNil(t, sj)
	assert.Equal(t, "^1.0.0", sj.Skills["code-review"])
	assert.Equal(t, "~2.1.0", sj.Skills["test-generator"])
	assert.Equal(t, ">=0.5.0", sj.Skills["@acme/deploy-helper"])
}

func TestLoadLockFile_FromFixture(t *testing.T) {
	// Copy fixture to temp dir with expected filename
	dir := t.TempDir()
	data, err := os.ReadFile("../../testdata/skills-json/valid-lock.json")
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(dir, SkillsLockFile), data, 0o644))

	lock, err := LoadLockFile(dir)
	require.NoError(t, err)
	require.NotNil(t, lock)
	assert.Equal(t, 1, lock.LockfileVersion)
	assert.Equal(t, "1.2.3", lock.Skills["code-review"].Version)
	assert.Equal(t, "github:testuser", lock.Skills["test-generator"].Signer)
	assert.Len(t, lock.Skills, 3)
}
