// Package skillsjson manages skills.json and skills-lock.json files.
// skills.json tracks installed skill dependencies (name -> version range).
// skills-lock.json locks resolved versions with checksums and metadata.
package skillsjson

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	SkillsJsonFile = "skills.json"
	SkillsLockFile = "skills-lock.json"
	LockVersion    = 1
)

// GeneratedBy is set at startup from cmd.Version via SetVersion.
var GeneratedBy = "spm@dev"

// SetVersion updates the GeneratedBy string used in lock files.
func SetVersion(v string) {
	GeneratedBy = "spm@" + v
}

// SkillsJson represents the skills.json file structure.
type SkillsJson struct {
	Skills map[string]string `json:"skills"`
}

// LockEntry represents a single locked skill entry.
type LockEntry struct {
	Version  string `json:"version"`
	Resolved string `json:"resolved"`
	Checksum string `json:"checksum"`
	Source   string `json:"source"`
	Signer   string `json:"signer,omitempty"`
}

// SkillsLock represents the skills-lock.json file structure.
type SkillsLock struct {
	LockfileVersion int                  `json:"lockfileVersion"`
	GeneratedAt     string               `json:"generated_at"`
	GeneratedBy     string               `json:"generated_by"`
	Skills          map[string]LockEntry `json:"skills"`
}

// ResolvedSkill holds data for a skill that has been resolved by the version resolver.
type ResolvedSkill struct {
	Name        string
	Version     string
	DownloadURL string
	Checksum    string
	Signed      bool
	Signer      string
}

// LoadSkillsJson reads and parses skills.json from the given directory.
// Returns nil, nil if the file does not exist.
func LoadSkillsJson(dir string) (*SkillsJson, error) {
	filePath := filepath.Join(dir, SkillsJsonFile)
	data, err := os.ReadFile(filePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading %s: %w", SkillsJsonFile, err)
	}

	var sj SkillsJson
	if err := json.Unmarshal(data, &sj); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", SkillsJsonFile, err)
	}

	if sj.Skills == nil {
		sj.Skills = make(map[string]string)
	}

	return &sj, nil
}

// SaveSkillsJson writes skills.json to the given directory.
// Creates the directory if it does not exist.
func SaveSkillsJson(dir string, sj *SkillsJson) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating directory %s: %w", dir, err)
	}

	data, err := json.MarshalIndent(sj, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling %s: %w", SkillsJsonFile, err)
	}

	filePath := filepath.Join(dir, SkillsJsonFile)
	if err := os.WriteFile(filePath, append(data, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", SkillsJsonFile, err)
	}

	return nil
}

// AddSkill adds or updates a skill entry in skills.json.
// Creates the file if it does not exist.
func AddSkill(dir string, name string, versionRange string) error {
	sj, err := LoadSkillsJson(dir)
	if err != nil {
		return err
	}
	if sj == nil {
		sj = &SkillsJson{Skills: make(map[string]string)}
	}

	sj.Skills[name] = versionRange
	return SaveSkillsJson(dir, sj)
}

// RemoveSkill removes a skill entry from skills.json.
// Returns false if the skill was not found.
func RemoveSkill(dir string, name string) (bool, error) {
	sj, err := LoadSkillsJson(dir)
	if err != nil {
		return false, err
	}
	if sj == nil {
		return false, nil
	}

	if _, exists := sj.Skills[name]; !exists {
		return false, nil
	}

	delete(sj.Skills, name)
	return true, SaveSkillsJson(dir, sj)
}

// LoadLockFile reads and parses skills-lock.json from the given directory.
// Returns nil, nil if the file does not exist.
func LoadLockFile(dir string) (*SkillsLock, error) {
	filePath := filepath.Join(dir, SkillsLockFile)
	data, err := os.ReadFile(filePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading %s: %w", SkillsLockFile, err)
	}

	var lock SkillsLock
	if err := json.Unmarshal(data, &lock); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", SkillsLockFile, err)
	}

	if lock.Skills == nil {
		lock.Skills = make(map[string]LockEntry)
	}

	return &lock, nil
}

// SaveLockFile writes skills-lock.json to the given directory.
// Creates the directory if it does not exist.
func SaveLockFile(dir string, lock *SkillsLock) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating directory %s: %w", dir, err)
	}

	data, err := json.MarshalIndent(lock, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling %s: %w", SkillsLockFile, err)
	}

	filePath := filepath.Join(dir, SkillsLockFile)
	if err := os.WriteFile(filePath, append(data, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", SkillsLockFile, err)
	}

	return nil
}

// UpdateLockFile merges resolved skills into the lock file.
// Preserves existing entries and adds/updates changed ones.
// Creates the file if it does not exist.
func UpdateLockFile(dir string, resolved []ResolvedSkill) error {
	lock, err := LoadLockFile(dir)
	if err != nil {
		return err
	}
	if lock == nil {
		lock = &SkillsLock{
			LockfileVersion: LockVersion,
			Skills:          make(map[string]LockEntry),
		}
	}
	// Always update metadata on write
	lock.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	lock.GeneratedBy = GeneratedBy

	for _, skill := range resolved {
		entry := LockEntry{
			Version:  skill.Version,
			Resolved: skill.DownloadURL,
			Checksum: skill.Checksum,
			Source:   "registry",
		}
		if skill.Signer != "" {
			entry.Signer = skill.Signer
		}
		lock.Skills[skill.Name] = entry
	}

	lock.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	return SaveLockFile(dir, lock)
}

// RemoveFromLockFile removes a skill entry from the lock file.
// Returns false if the skill was not found.
func RemoveFromLockFile(dir string, name string) (bool, error) {
	lock, err := LoadLockFile(dir)
	if err != nil {
		return false, err
	}
	if lock == nil {
		return false, nil
	}

	if _, exists := lock.Skills[name]; !exists {
		return false, nil
	}

	delete(lock.Skills, name)
	lock.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	return true, SaveLockFile(dir, lock)
}
