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

var uninstallFlagKeepFiles bool

var uninstallCmd = &cobra.Command{
	Use:     "uninstall <name> [name...]",
	Aliases: []string{"remove", "rm", "un"},
	Short:   "Uninstall one or more skills",
	Long: `Remove skills from agent directories, skills.json, and optionally delete files.

Examples:
  spm uninstall my-skill
  spm uninstall skill-a skill-b
  spm uninstall my-skill --keep-files`,
	Args: cobra.MinimumNArgs(1),
	RunE: runUninstall,
}

func init() {
	uninstallCmd.Flags().BoolVar(&uninstallFlagKeepFiles, "keep-files", false, "Unlink but don't delete skill files")
	rootCmd.AddCommand(uninstallCmd)
}

// uninstallResult holds the result of uninstalling a single skill.
type uninstallResult struct {
	Name            string   `json:"name"`
	UnlinkedAgents  []string `json:"unlinked_agents,omitempty"`
	RemovedFromJSON bool     `json:"removed_from_json"`
	RemovedFromLock bool     `json:"removed_from_lock"`
	FilesDeleted    bool     `json:"files_deleted"`
}

// uninstallJSONOutput is the JSON mode output for the uninstall command.
type uninstallJSONOutput struct {
	Command string            `json:"command"`
	Status  string            `json:"status"`
	Skills  []uninstallResult `json:"skills"`
}

func runUninstall(cmd *cobra.Command, args []string) error {
	spmHome, err := config.HomeDir()
	if err != nil {
		return fmt.Errorf("determining SPM home: %w", err)
	}

	homeDir := filepath.Dir(spmHome)
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	lnk := linker.NewDefault(homeDir)
	results := make([]uninstallResult, 0, len(args))

	for _, skillName := range args {
		res := uninstallSkill(skillName, cwd, spmHome, lnk)
		results = append(results, res)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(uninstallJSONOutput{
			Command: "uninstall",
			Status:  "success",
			Skills:  results,
		})
	}

	Out.Log("")
	for _, r := range results {
		Out.Log("%s %s uninstalled", output.Icons["success"], output.Cyan(r.Name))
		if len(r.UnlinkedAgents) > 0 {
			Out.Log("  Unlinked from: %s", strings.Join(r.UnlinkedAgents, ", "))
		}
		if r.RemovedFromJSON {
			Out.Log("  Removed from skills.json")
		}
		if r.RemovedFromLock {
			Out.Log("  Removed from skills-lock.json")
		}
		if r.FilesDeleted {
			Out.Log("  Skill files deleted")
		}
	}

	return nil
}

func uninstallSkill(name, cwd, spmHome string, lnk *linker.Linker) uninstallResult {
	res := uninstallResult{Name: name}

	// Unlink from all agent directories
	unlinked, err := lnk.UnlinkSkill(name)
	if err != nil {
		Out.LogVerbose("Failed to unlink %s: %s", name, err)
	} else {
		res.UnlinkedAgents = unlinked
	}

	// Remove from skills.json
	removed, err := skillsjson.RemoveSkill(cwd, name)
	if err != nil {
		Out.LogVerbose("Failed to remove %s from skills.json: %s", name, err)
	}
	res.RemovedFromJSON = removed

	// Remove from lock file
	removedLock, err := skillsjson.RemoveFromLockFile(cwd, name)
	if err != nil {
		Out.LogVerbose("Failed to remove %s from lock file: %s", name, err)
	}
	res.RemovedFromLock = removedLock

	// Delete skill files unless --keep-files
	if !uninstallFlagKeepFiles {
		skillStoreDir := filepath.Join(spmHome, "skills", name)
		if err := os.RemoveAll(skillStoreDir); err != nil {
			Out.LogVerbose("Failed to remove skill files at %s: %s", skillStoreDir, err)
		} else {
			res.FilesDeleted = true
		}

		// Also remove cache
		cacheDir := filepath.Join(spmHome, "cache", name)
		_ = os.RemoveAll(cacheDir)
	}

	return res
}
