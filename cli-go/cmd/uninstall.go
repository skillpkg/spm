package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/linker"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/skillsjson"
	"github.com/spf13/cobra"
)

var uninstallCmd = &cobra.Command{
	Use:     "uninstall <@scope/name> [...]",
	Aliases: []string{"remove", "rm"},
	Short:   "Remove one or more installed skills",
	Long: `Remove skills by name. For each skill this will:

  1. Remove the entry from skills.json
  2. Remove the entry from skills-lock.json
  3. Unlink from all agent directories
  4. Remove cached files from ~/.spm/skills/

Examples:
  spm uninstall @scope/my-skill
  spm uninstall @alice/skill-a @bob/skill-b
  spm remove @scope/my-skill
  spm rm @scope/my-skill`,
	Args: cobra.MinimumNArgs(1),
	RunE: runUninstall,
}

func init() {
	rootCmd.AddCommand(uninstallCmd)
}

// uninstallResult holds the result of uninstalling a single skill.
type uninstallResult struct {
	Name           string   `json:"name"`
	Version        string   `json:"version,omitempty"`
	UnlinkedAgents []string `json:"unlinked_agents,omitempty"`
	CacheRemoved   bool     `json:"cache_removed"`
}

// uninstallJSONOutput is the JSON mode output for the uninstall command.
type uninstallJSONOutput struct {
	Command string            `json:"command"`
	Status  string            `json:"status"`
	Skills  []uninstallResult `json:"skills"`
	Errors  []string          `json:"errors,omitempty"`
}

func runUninstall(cmd *cobra.Command, args []string) error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	spmHome, err := config.HomeDir()
	if err != nil {
		return fmt.Errorf("determining SPM home: %w", err)
	}

	// Check that skills.json exists — error gracefully if not
	sj, err := skillsjson.LoadSkillsJson(cwd)
	if err != nil {
		return fmt.Errorf("loading skills.json: %w", err)
	}
	if sj == nil {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(uninstallJSONOutput{
				Command: "uninstall",
				Status:  "error",
				Skills:  []uninstallResult{},
				Errors:  []string{"no skills.json found in the current directory"},
			})
		}
		Out.LogError("No skills.json found in the current directory.")
		Out.Log("  Initialize a project with %s first.", output.Cyan("spm init"))
		return fmt.Errorf("no skills.json found")
	}

	// Load lock file to get version info
	lock, _ := skillsjson.LoadLockFile(cwd)

	// Set up linker
	homeDir := filepath.Dir(spmHome)
	agentDirs := linker.DefaultAgentDirs(homeDir)
	lnk := linker.New(agentDirs)

	results := make([]uninstallResult, 0, len(args))
	var errMsgs []string

	for _, name := range args {
		res := uninstallResult{Name: name}

		// Get version from lock file before removing
		if lock != nil {
			if entry, ok := lock.Skills[name]; ok {
				res.Version = entry.Version
			}
		}

		// 1. Remove from skills.json
		found, err := skillsjson.RemoveSkill(cwd, name)
		if err != nil {
			errMsg := fmt.Sprintf("failed to update skills.json for %s: %s", name, err)
			errMsgs = append(errMsgs, errMsg)
			Out.LogError("%s", errMsg)
			continue
		}
		if !found {
			errMsg := fmt.Sprintf("skill %s not found in skills.json", name)
			errMsgs = append(errMsgs, errMsg)
			Out.LogError("%s", errMsg)
			continue
		}

		// 2. Remove from skills-lock.json
		if _, err := skillsjson.RemoveFromLockFile(cwd, name); err != nil {
			Out.LogVerbose("Failed to update lock file for %s: %s", name, err)
		}

		// 3. Unlink from agent directories
		unlinkedAgents, err := lnk.UnlinkSkill(name)
		if err != nil {
			Out.LogVerbose("Failed to unlink %s: %s", name, err)
		}
		res.UnlinkedAgents = unlinkedAgents

		// 4. Remove from local cache (~/.spm/skills/<name>/)
		cacheDir := filepath.Join(spmHome, "skills", name)
		if _, statErr := os.Stat(cacheDir); statErr == nil {
			if err := os.RemoveAll(cacheDir); err != nil {
				Out.LogVerbose("Failed to remove cache for %s: %s", name, err)
			} else {
				res.CacheRemoved = true
			}
		}

		results = append(results, res)
	}

	// JSON output
	if Out.Mode == output.ModeJSON {
		status := "success"
		if len(errMsgs) > 0 && len(results) == 0 {
			status = "error"
		} else if len(errMsgs) > 0 {
			status = "partial"
		}
		return Out.LogJSON(uninstallJSONOutput{
			Command: "uninstall",
			Status:  status,
			Skills:  results,
			Errors:  errMsgs,
		})
	}

	// Human output
	if len(results) == 0 {
		return fmt.Errorf("no skills were uninstalled")
	}

	Out.Log("")
	for _, r := range results {
		versionStr := ""
		if r.Version != "" {
			versionStr = "@" + r.Version
		}
		Out.Log("%s %s%s removed", output.Icons["success"],
			output.Cyan(r.Name), output.Green(versionStr))
		if len(r.UnlinkedAgents) > 0 {
			Out.Log("  Unlinked from: %s", strings.Join(r.UnlinkedAgents, ", "))
		}
	}

	Out.Log("")
	Out.Log("%s %d skill(s) removed", output.Icons["success"], len(results))

	return nil
}
