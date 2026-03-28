package cmd

import (
	"fmt"
	"os"

	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/skillsjson"
	"github.com/spf13/cobra"
)

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List installed skills",
	Long:  "Show skills installed in the current project (from skills.json) and their locked versions.",
	Args:  cobra.NoArgs,
	RunE:  runList,
}

func init() {
	rootCmd.AddCommand(listCmd)
}

func runList(_ *cobra.Command, _ []string) error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	sj, err := skillsjson.LoadSkillsJson(cwd)
	if err != nil {
		return fmt.Errorf("reading skills.json: %w", err)
	}

	lock, err := skillsjson.LoadLockFile(cwd)
	if err != nil {
		// Non-fatal: we can still show skills.json data without lock info
		lock = nil
	}

	if Out.Mode == output.ModeJSON {
		type jsonEntry struct {
			Name    string `json:"name"`
			Range   string `json:"range"`
			Version string `json:"version,omitempty"`
			Signer  string `json:"signer,omitempty"`
		}
		entries := []jsonEntry{}
		if sj != nil {
			for name, rangeSpec := range sj.Skills {
				entry := jsonEntry{Name: name, Range: rangeSpec}
				if lock != nil {
					if le, ok := lock.Skills[name]; ok {
						entry.Version = le.Version
						entry.Signer = le.Signer
					}
				}
				entries = append(entries, entry)
			}
		}
		return Out.LogJSON(map[string]any{
			"skills": entries,
			"total":  len(entries),
		})
	}

	if sj == nil || len(sj.Skills) == 0 {
		Out.Log("")
		Out.Log("  %s No skills installed.", output.Icons["info"])
		Out.Log("")
		Out.Log("  %s", output.Dim("Install a skill: spm install <name>"))
		Out.Log("  %s", output.Dim("Search for skills: spm search <query>"))
		Out.Log("")
		return nil
	}

	Out.Log("")
	// Header
	nameH := padRight("NAME", 25)
	rangeH := padRight("RANGE", 15)
	versionH := padRight("VERSION", 15)
	signerH := "SIGNED BY"
	Out.Log("  %s%s%s%s", output.Bold(nameH), output.Bold(rangeH), output.Bold(versionH), output.Bold(signerH))

	for name, rangeSpec := range sj.Skills {
		nameStr := padRight(name, 25)
		rangeStr := padRight(rangeSpec, 15)
		verStr := padRight("-", 15)
		signerStr := ""

		if lock != nil {
			if le, ok := lock.Skills[name]; ok {
				verStr = padRight(le.Version, 15)
				if le.Signer != "" {
					signerStr = output.Green(le.Signer)
				}
			}
		}

		Out.Log("  %s%s%s%s", output.Cyan(nameStr), rangeStr, verStr, signerStr)
	}

	Out.Log("")
	Out.Log("  %d skill%s installed", len(sj.Skills), pluralS(len(sj.Skills)))
	Out.Log("")

	return nil
}
