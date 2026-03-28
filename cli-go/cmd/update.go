package cmd

import (
	"fmt"
	"os"
	"runtime"
	"strings"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/resolver"
	"github.com/skillpkg/spm/internal/skillsjson"
	"github.com/spf13/cobra"
)

var updateCmd = &cobra.Command{
	Use:     "update [name...]",
	Aliases: []string{"up", "upgrade"},
	Short:   "Update skills to latest matching versions",
	Long: `Check for newer versions of installed skills and update them.

If no arguments are given, updates all skills in skills.json.

Examples:
  spm update
  spm update my-skill
  spm update skill-a skill-b`,
	RunE: runUpdate,
}

func init() {
	rootCmd.AddCommand(updateCmd)
}

// updateEntry tracks an individual skill update.
type updateEntry struct {
	Name       string `json:"name"`
	OldVersion string `json:"from"`
	NewVersion string `json:"to"`
}

// updateJSONOutput is the JSON mode output for the update command.
type updateJSONOutput struct {
	Command string        `json:"command"`
	Status  string        `json:"status"`
	Updates []updateEntry `json:"updates"`
}

func runUpdate(cmd *cobra.Command, args []string) error {
	spmHome, err := config.HomeDir()
	if err != nil {
		return fmt.Errorf("determining SPM home: %w", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	// Load skills.json
	sj, err := skillsjson.LoadSkillsJson(cwd)
	if err != nil {
		return fmt.Errorf("loading skills.json: %w", err)
	}
	if sj == nil || len(sj.Skills) == 0 {
		Out.Log("%s No skills.json found. Nothing to update.", output.Icons["info"])
		return nil
	}

	// Load lock file to know current versions
	lock, err := skillsjson.LoadLockFile(cwd)
	if err != nil {
		Out.LogVerbose("Failed to load lock file: %s", err)
	}

	// Determine which skills to check
	type checkItem struct {
		name   string
		vrange string
	}
	var toCheck []checkItem

	if len(args) > 0 {
		for _, arg := range args {
			spec, err := resolver.Parse(arg)
			if err != nil {
				return fmt.Errorf("invalid specifier %q: %w", arg, err)
			}
			name := spec.FullName()
			vrange := spec.VersionRange
			if vrange == "" {
				// Use range from skills.json if available
				if r, ok := sj.Skills[name]; ok {
					vrange = r
				} else {
					vrange = "latest"
				}
			}
			toCheck = append(toCheck, checkItem{name: name, vrange: vrange})
		}
	} else {
		for name, vrange := range sj.Skills {
			toCheck = append(toCheck, checkItem{name: name, vrange: vrange})
		}
	}

	if len(toCheck) == 0 {
		Out.Log("%s No skills to update.", output.Icons["info"])
		return nil
	}

	// Resolve latest versions
	resolveSkills := make([]api.ResolveSkill, 0, len(toCheck))
	for _, item := range toCheck {
		resolveSkills = append(resolveSkills, api.ResolveSkill{
			Name:  item.name,
			Range: item.vrange,
		})
	}

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner("Checking for updates...")
	resolveResp, err := client.Resolve(resolveSkills, runtime.GOOS)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("resolving skills: %w", err)
	}

	// Report unresolved
	for _, u := range resolveResp.Unresolved {
		Out.LogError("Could not resolve: %s - %s", u.Name, u.Error)
	}

	// Compare resolved versions against lock file
	var candidates []struct {
		resolved   api.ResolvedSkill
		oldVersion string
		newVersion string
	}

	for _, skill := range resolveResp.Resolved {
		oldVersion := "not installed"
		if lock != nil {
			if entry, ok := lock.Skills[skill.Name]; ok {
				oldVersion = entry.Version
				if entry.Version == skill.Version {
					continue // already up to date
				}
			}
		}
		candidates = append(candidates, struct {
			resolved   api.ResolvedSkill
			oldVersion string
			newVersion string
		}{
			resolved:   skill,
			oldVersion: oldVersion,
			newVersion: skill.Version,
		})
	}

	if len(candidates) == 0 {
		msg := fmt.Sprintf("%s All skills are up to date.", output.Icons["success"])
		Out.Log(msg)
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(updateJSONOutput{
				Command: "update",
				Status:  "success",
				Updates: []updateEntry{},
			})
		}
		return nil
	}

	// Show update plan
	Out.Log("")
	Out.Log("%s Updates available:", output.Bold(""))
	for _, c := range candidates {
		Out.Log("  %s: %s %s %s",
			output.Cyan(c.resolved.Name),
			output.Dim(c.oldVersion),
			output.Icons["arrow"],
			output.Green(c.newVersion))
	}

	// Perform updates
	Out.Log("")
	updates := make([]updateEntry, 0, len(candidates))
	lockUpdates := make([]skillsjson.ResolvedSkill, 0, len(candidates))

	for _, c := range candidates {
		skill := c.resolved

		res, err := downloadExtractLink(client, skill, spmHome, true)
		if err != nil {
			Out.LogError("Failed to update %s: %s", skill.Name, err)
			continue
		}

		updates = append(updates, updateEntry{
			Name:       skill.Name,
			OldVersion: c.oldVersion,
			NewVersion: c.newVersion,
		})

		lockUpdates = append(lockUpdates, skillsjson.ResolvedSkill{
			Name:        skill.Name,
			Version:     skill.Version,
			DownloadURL: skill.DownloadURL,
			Checksum:    skill.ChecksumSHA256,
		})

		Out.Log("  %s %s: %s %s %s",
			output.Icons["success"],
			output.Cyan(skill.Name),
			output.Dim(c.oldVersion),
			output.Icons["arrow"],
			output.Green(c.newVersion))

		if len(res.LinkedAgents) > 0 {
			Out.LogVerbose("Linked to: %s", strings.Join(res.LinkedAgents, ", "))
		}
	}

	// Update lock file
	if len(lockUpdates) > 0 {
		if err := skillsjson.UpdateLockFile(cwd, lockUpdates); err != nil {
			Out.LogVerbose("Failed to update lock file: %s", err)
		}
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(updateJSONOutput{
			Command: "update",
			Status:  "success",
			Updates: updates,
		})
	}

	Out.Log("")
	Out.Log("%s %d skill(s) updated", output.Icons["success"], len(updates))
	return nil
}
