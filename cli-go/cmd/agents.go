package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

// agentDef defines a known AI agent and its skills directory.
type agentDef struct {
	Name string
	Dir  string
}

// agentResult holds detection results for an agent.
type agentResult struct {
	Name       string `json:"name"`
	SkillsDir  string `json:"skills_dir"`
	Detected   bool   `json:"detected"`
	SkillCount int    `json:"skill_count"`
}

// knownAgentsFunc allows overriding for tests.
var knownAgentsFunc = defaultKnownAgents

func defaultKnownAgents() []agentDef {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil
	}
	return []agentDef{
		{Name: "Claude Code", Dir: filepath.Join(home, ".claude", "skills")},
		{Name: "Cursor", Dir: filepath.Join(home, ".cursor", "skills")},
		{Name: "Codex", Dir: filepath.Join(home, ".agents", "skills")},
		{Name: "Copilot", Dir: filepath.Join(home, ".copilot", "skills")},
		{Name: "Gemini CLI", Dir: filepath.Join(home, ".gemini", "skills")},
	}
}

var agentsCmd = &cobra.Command{
	Use:   "agents",
	Short: "Detect installed AI agents and linked skills",
	Long:  "Check known agent directories for installed AI agents and count linked skills.",
	Args:  cobra.NoArgs,
	RunE:  runAgents,
}

func init() {
	rootCmd.AddCommand(agentsCmd)
}

func detectAgent(def agentDef) agentResult {
	result := agentResult{
		Name:      def.Name,
		SkillsDir: def.Dir,
	}

	info, err := os.Stat(def.Dir)
	if err != nil || !info.IsDir() {
		return result
	}

	result.Detected = true

	entries, err := os.ReadDir(def.Dir)
	if err != nil {
		return result
	}

	for _, e := range entries {
		if e.IsDir() {
			result.SkillCount++
		}
	}

	return result
}

func shortenPath(fullPath string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return fullPath
	}
	if strings.HasPrefix(fullPath, home) {
		return "~" + fullPath[len(home):]
	}
	return fullPath
}

func runAgents(_ *cobra.Command, _ []string) error {
	agents := knownAgentsFunc()
	results := make([]agentResult, 0, len(agents))
	for _, a := range agents {
		results = append(results, detectAgent(a))
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(results)
	}

	Out.Log("")
	Out.Log("  Detected agents:")
	Out.Log("")

	detectedCount := 0
	totalSkills := 0

	for _, r := range results {
		if r.Detected {
			detectedCount++
			totalSkills += r.SkillCount
			nameStr := padRight(r.Name, 15)
			pathStr := padRight(shortenPath(r.SkillsDir), 30)
			countStr := fmt.Sprintf("%d skill%s linked", r.SkillCount, pluralS(r.SkillCount))
			Out.Log("    %s %s%s%s", output.Green(output.Icons["success"]), output.Cyan(nameStr), output.Dim(pathStr), countStr)
		} else {
			nameStr := padRight(r.Name, 15)
			Out.Log("    %s %s%s", output.Dim("-"), output.Dim(nameStr), output.Dim("(not detected)"))
		}
	}

	Out.Log("")
	if detectedCount > 0 && totalSkills > 0 {
		Out.Log("  %d skill%s linked across %d agent%s", totalSkills, pluralS(totalSkills), detectedCount, pluralS(detectedCount))
	} else if detectedCount > 0 {
		Out.Log("  %d agent%s detected, no skills linked yet", detectedCount, pluralS(detectedCount))
		Out.Log("  %s", output.Dim("Install a skill: spm install <name>"))
	} else {
		Out.Log("  %s No agents detected", output.Icons["info"])
		Out.Log("  %s", output.Dim("Install an AI agent to get started."))
	}
	Out.Log("")

	return nil
}
