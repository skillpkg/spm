// Package linker manages linking skills to agent directories.
// It creates symlinks (preferred) or copies files (fallback) into
// agent-specific skill directories like ~/.claude/skills/, ~/.cursor/skills/, etc.
package linker

import (
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// AgentDir represents a known agent's skills directory.
type AgentDir struct {
	Name      string
	SkillsDir string
}

// LinkResult contains the result of a link operation.
type LinkResult struct {
	Agents []string
	Method string // "symlink" or "copy"
	IsCopy bool
}

// DefaultAgentDirs returns the default agent directories based on the home directory.
func DefaultAgentDirs(homeDir string) []AgentDir {
	return []AgentDir{
		{Name: "Claude Code", SkillsDir: filepath.Join(homeDir, ".claude", "skills")},
		{Name: "Cursor", SkillsDir: filepath.Join(homeDir, ".cursor", "skills")},
		{Name: "Codex", SkillsDir: filepath.Join(homeDir, ".agents", "skills")},
	}
}

// Linker manages skill-to-agent directory linking.
type Linker struct {
	AgentDirs []AgentDir
}

// New creates a new Linker with the given agent directories.
func New(agentDirs []AgentDir) *Linker {
	return &Linker{AgentDirs: agentDirs}
}

// NewDefault creates a new Linker with default agent directories.
func NewDefault(homeDir string) *Linker {
	return New(DefaultAgentDirs(homeDir))
}

// bareName extracts the short name from a scoped skill name.
// "@scope/my-skill" → "my-skill", "my-skill" → "my-skill"
func bareName(name string) string {
	if i := strings.LastIndex(name, "/"); i >= 0 {
		return name[i+1:]
	}
	return name
}

// LinkSkill links a skill to all agent directories.
// Tries symlink first, falls back to copy if symlink fails.
// Scoped names like "@scope/my-skill" are linked as just "my-skill"
// so the slash command is /my-skill instead of /@scope/my-skill.
func (l *Linker) LinkSkill(skillPath string, skillName string) (*LinkResult, error) {
	linkedAgents := make([]string, 0)
	dirName := bareName(skillName)

	// Try symlinks first
	for _, agent := range l.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, dirName)
		if err := trySymlink(skillPath, targetDir); err == nil {
			linkedAgents = append(linkedAgents, agent.Name)
		}
	}

	if len(linkedAgents) > 0 {
		return &LinkResult{
			Agents: linkedAgents,
			Method: "symlink",
			IsCopy: false,
		}, nil
	}

	// Fallback to copy
	copiedAgents := make([]string, 0)
	for _, agent := range l.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, dirName)
		if err := tryCopy(skillPath, targetDir); err == nil {
			copiedAgents = append(copiedAgents, agent.Name)
		}
	}

	return &LinkResult{
		Agents: copiedAgents,
		Method: "copy",
		IsCopy: true,
	}, nil
}

// UnlinkSkill removes a skill from all agent directories.
// Returns the list of agent names from which the skill was removed.
func (l *Linker) UnlinkSkill(skillName string) ([]string, error) {
	unlinkedAgents := make([]string, 0)
	dirName := bareName(skillName)

	for _, agent := range l.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, dirName)

		// Check if it's a symlink
		fi, err := os.Lstat(targetDir)
		if err != nil {
			continue // doesn't exist, skip
		}

		if fi.Mode()&os.ModeSymlink != 0 {
			// It's a symlink — remove it
			if err := os.Remove(targetDir); err == nil {
				unlinkedAgents = append(unlinkedAgents, agent.Name)
			}
		} else if fi.IsDir() {
			// It's a copy — remove recursively
			if err := os.RemoveAll(targetDir); err == nil {
				unlinkedAgents = append(unlinkedAgents, agent.Name)
			}
		}
	}

	return unlinkedAgents, nil
}

// GetLinkedAgents returns the list of agent names where the skill is linked.
func (l *Linker) GetLinkedAgents(skillName string) []string {
	linked := make([]string, 0)
	dirName := bareName(skillName)

	for _, agent := range l.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, dirName)
		if _, err := os.Lstat(targetDir); err == nil {
			linked = append(linked, agent.Name)
		}
	}

	return linked
}

// IsSkillCopy returns true if the skill in agent directories is a copy (not a symlink).
func (l *Linker) IsSkillCopy(skillName string) bool {
	dirName := bareName(skillName)
	for _, agent := range l.AgentDirs {
		targetDir := filepath.Join(agent.SkillsDir, dirName)
		fi, err := os.Lstat(targetDir)
		if err != nil {
			continue
		}
		if fi.Mode()&os.ModeSymlink != 0 {
			return false // found a symlink
		}
		if fi.IsDir() {
			return true // found a copy
		}
	}
	return false
}

// trySymlink creates a symlink at targetDir pointing to skillPath.
// Creates parent directories as needed. Removes existing link/dir if present.
func trySymlink(skillPath string, targetDir string) error {
	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(targetDir), 0o755); err != nil {
		return fmt.Errorf("creating parent directory: %w", err)
	}

	// Check for existing entry
	fi, err := os.Lstat(targetDir)
	if err == nil {
		if fi.Mode()&os.ModeSymlink != 0 {
			// Read existing symlink target
			existing, err := os.Readlink(targetDir)
			if err == nil && existing == skillPath {
				return nil // already linked correctly
			}
			// Remove stale symlink
			if err := os.Remove(targetDir); err != nil {
				return fmt.Errorf("removing existing symlink: %w", err)
			}
		} else {
			// Remove existing file/dir
			if err := os.RemoveAll(targetDir); err != nil {
				return fmt.Errorf("removing existing entry: %w", err)
			}
		}
	}

	return os.Symlink(skillPath, targetDir)
}

// tryCopy copies the skill directory to targetDir.
func tryCopy(skillPath string, targetDir string) error {
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return fmt.Errorf("creating target directory: %w", err)
	}

	return filepath.WalkDir(skillPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(skillPath, path)
		if err != nil {
			return err
		}

		targetPath := filepath.Join(targetDir, relPath)

		if d.IsDir() {
			return os.MkdirAll(targetPath, 0o755)
		}

		return copyFile(path, targetPath)
	})
}

// copyFile copies a single file from src to dst.
func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() { _ = srcFile.Close() }()

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer func() { _ = dstFile.Close() }()

	_, err = io.Copy(dstFile, srcFile)
	return err
}
