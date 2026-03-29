package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/skillpkg/spm/internal/manifest"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var (
	initName        string
	initVersion     string
	initDescription string
	initCategory    string
	initAuthor      string
	initLicense     string
)

var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Create a new skill project",
	Long:  "Initialize a new skill project by creating manifest.json, SKILL.md, and eval.json files.",
	RunE:  runInit,
}

func init() {
	initCmd.Flags().StringVar(&initName, "name", "", "Skill name (kebab-case)")
	initCmd.Flags().StringVar(&initVersion, "version", "0.1.0", "Initial version")
	initCmd.Flags().StringVar(&initDescription, "description", "", "Skill description")
	initCmd.Flags().StringVar(&initCategory, "category", "other", "Category (e.g. productivity, testing, ai-ml)")
	initCmd.Flags().StringVar(&initAuthor, "author", "", "Author name")
	initCmd.Flags().StringVar(&initLicense, "license", "MIT", "License identifier")
	rootCmd.AddCommand(initCmd)
}

func skillMDTemplate(name, description string) string {
	return fmt.Sprintf(`# %s

%s

## Usage

Describe how an AI agent should use this skill.

## Examples

### Example 1

**Input:** Describe a sample input.

**Output:** Describe the expected output.

## Notes

- Add any important notes or constraints here.
`, name, description)
}

func defaultEvalJSON() map[string]any {
	return map[string]any{
		"tests": []map[string]any{
			{
				"name":              "basic test",
				"input":             "Describe a sample input",
				"expected_contains": []string{"expected", "output"},
			},
		},
	}
}

func runInit(_ *cobra.Command, _ []string) error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	// Determine skill name from flag or directory name
	name := initName
	if name == "" {
		name = dirToKebab(filepath.Base(cwd))
	}

	description := initDescription
	if description == "" {
		description = fmt.Sprintf("A skill for %s", name)
	}

	category := initCategory
	if !manifest.IsValidCategory(category) {
		return fmt.Errorf("invalid category: %s (valid: %v)", category, manifest.Categories)
	}

	m := &manifest.Manifest{
		Name:        name,
		Version:     initVersion,
		Description: description,
		Categories:  []string{category},
		License:     initLicense,
		Keywords:    []string{},
		Agents: &manifest.Agents{
			Platforms: []string{"*"},
		},
		SPM: &manifest.SPMMetadata{
			ManifestVersion: 1,
		},
	}

	if initAuthor != "" {
		m.Authors = []manifest.Person{{Name: initAuthor}}
	}

	// Validate manifest
	if err := manifest.Validate(m); err != nil {
		return fmt.Errorf("manifest validation failed: %w", err)
	}

	// Write manifest.json
	manifestData, err := m.ToJSON()
	if err != nil {
		return fmt.Errorf("serializing manifest: %w", err)
	}

	manifestPath := filepath.Join(cwd, "manifest.json")
	if err := os.WriteFile(manifestPath, append(manifestData, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing manifest.json: %w", err)
	}

	// Write SKILL.md
	skillMDPath := filepath.Join(cwd, "SKILL.md")
	if err := os.WriteFile(skillMDPath, []byte(skillMDTemplate(name, description)), 0o644); err != nil {
		return fmt.Errorf("writing SKILL.md: %w", err)
	}

	// Create tests directory and eval.json
	testsDir := filepath.Join(cwd, "tests")
	if err := os.MkdirAll(testsDir, 0o755); err != nil {
		return fmt.Errorf("creating tests directory: %w", err)
	}

	evalData, err := json.MarshalIndent(defaultEvalJSON(), "", "  ")
	if err != nil {
		return fmt.Errorf("serializing eval.json: %w", err)
	}
	evalPath := filepath.Join(testsDir, "eval.json")
	if err := os.WriteFile(evalPath, append(evalData, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing eval.json: %w", err)
	}

	// JSON mode
	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"name":       name,
			"version":    initVersion,
			"categories": []string{category},
			"license":    initLicense,
			"files":      []string{"manifest.json", "SKILL.md", "tests/eval.json"},
		})
	}

	// Human mode
	Out.Log("")
	Out.Log("  %s Created skill %s", output.Icons["success"], output.Cyan(name))
	Out.Log("")
	Out.Log("  %s  — skill metadata", output.Dim("manifest.json"))
	Out.Log("  %s       — skill instructions", output.Dim("SKILL.md"))
	Out.Log("  %s  — eval test cases", output.Dim("tests/eval.json"))
	Out.Log("")
	Out.Log("  Next steps:")
	Out.Log("    1. Edit %s with your skill instructions", output.Cyan("SKILL.md"))
	Out.Log("    2. Add test cases to %s", output.Cyan("tests/eval.json"))
	Out.Log("    3. Run %s to validate", output.Cyan("spm test"))
	Out.Log("    4. Run %s to create a package", output.Cyan("spm pack"))
	Out.Log("")

	return nil
}

// dirToKebab converts a directory name to a kebab-case skill name.
func dirToKebab(name string) string {
	result := make([]byte, 0, len(name))
	for _, ch := range []byte(name) {
		if ch >= 'A' && ch <= 'Z' {
			result = append(result, ch+32)
		} else if (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-' {
			result = append(result, ch)
		} else {
			result = append(result, '-')
		}
	}
	// Trim leading/trailing dashes
	s := string(result)
	for len(s) > 0 && s[0] == '-' {
		s = s[1:]
	}
	for len(s) > 0 && s[len(s)-1] == '-' {
		s = s[:len(s)-1]
	}
	if len(s) < 2 || s[0] < 'a' || s[0] > 'z' {
		return "my-skill"
	}
	return s
}
