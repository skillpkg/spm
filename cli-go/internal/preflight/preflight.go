// Package preflight detects and repairs broken symlinks in agent skill directories.
// It scans known agent directories for stale symlinks and orphaned copies,
// optionally removing them to keep the environment clean.
package preflight

import (
	"os"
	"path/filepath"
)

// IssueType classifies the kind of preflight issue found.
type IssueType string

const (
	BrokenSymlink IssueType = "broken-symlink"
	StaleCopy     IssueType = "stale-copy"
	Orphaned      IssueType = "orphaned"
)

// Issue represents a single preflight check finding.
type Issue struct {
	Type      IssueType
	SkillName string
	Agent     string
	Path      string
	Fixed     bool
	Detail    string
}

// Report summarizes the results of a preflight scan.
type Report struct {
	Issues  []Issue
	Found   int
	Removed int
	Healthy int
}

// AgentDir represents an agent's skills directory to scan.
type AgentDir struct {
	Name      string
	SkillsDir string
}

// DefaultAgentDirs returns the default agent directories based on the home directory.
func DefaultAgentDirs(homeDir string) []AgentDir {
	return []AgentDir{
		{Name: "Claude Code", SkillsDir: filepath.Join(homeDir, ".claude", "skills")},
		{Name: "Cursor", SkillsDir: filepath.Join(homeDir, ".cursor", "skills")},
		{Name: "Codex", SkillsDir: filepath.Join(homeDir, ".agents", "skills")},
	}
}

// Scan checks all agent directories for broken symlinks and stale entries.
// If autoRepair is true, broken symlinks are removed automatically.
func Scan(agentDirs []AgentDir, autoRepair bool) (*Report, error) {
	report := &Report{
		Issues: make([]Issue, 0),
	}

	for _, agent := range agentDirs {
		entries, err := os.ReadDir(agent.SkillsDir)
		if err != nil {
			// Skills dir doesn't exist — skip
			continue
		}

		for _, entry := range entries {
			entryPath := filepath.Join(agent.SkillsDir, entry.Name())

			fi, err := os.Lstat(entryPath)
			if err != nil {
				continue
			}

			if fi.Mode()&os.ModeSymlink != 0 {
				// It's a symlink — check if target exists
				target, err := os.Readlink(entryPath)
				if err != nil {
					continue
				}

				// Resolve relative symlink targets
				if !filepath.IsAbs(target) {
					target = filepath.Join(filepath.Dir(entryPath), target)
				}

				if _, err := os.Stat(target); err != nil {
					// Broken symlink
					issue := Issue{
						Type:      BrokenSymlink,
						SkillName: entry.Name(),
						Agent:     agent.Name,
						Path:      entryPath,
						Fixed:     false,
						Detail:    "Symlink target missing: " + target,
					}

					if autoRepair {
						if err := os.Remove(entryPath); err == nil {
							issue.Fixed = true
							report.Removed++
						}
					}

					report.Issues = append(report.Issues, issue)
					report.Found++
				} else {
					// Healthy symlink
					report.Healthy++
				}
			} else if fi.IsDir() {
				// It's a directory (copy) — considered healthy for now
				// (staleness would require API check, not done in preflight)
				report.Healthy++
			}
		}
	}

	return report, nil
}

// ScanDefault runs preflight checks using default agent directories.
func ScanDefault(homeDir string, autoRepair bool) (*Report, error) {
	return Scan(DefaultAgentDirs(homeDir), autoRepair)
}
