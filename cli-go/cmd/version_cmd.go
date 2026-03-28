package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/Masterminds/semver/v3"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version <major|minor|patch|explicit-version>",
	Short: "Bump version in manifest.json",
	Long:  "Bump the skill version in manifest.json. Accepts major, minor, patch, or an explicit semver string.",
	Args:  cobra.ExactArgs(1),
	RunE:  runVersion,
}

func init() {
	rootCmd.AddCommand(versionCmd)
}

func runVersion(_ *cobra.Command, args []string) error {
	release := args[0]

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	manifestPath := filepath.Join(cwd, "manifest.json")
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("could not read manifest.json: %w", err)
	}

	var parsed map[string]any
	if err := json.Unmarshal(data, &parsed); err != nil {
		return fmt.Errorf("invalid manifest.json: %w", err)
	}

	currentStr, ok := parsed["version"].(string)
	if !ok || currentStr == "" {
		return fmt.Errorf("manifest.json missing or invalid \"version\" field")
	}

	currentVer, err := semver.NewVersion(currentStr)
	if err != nil {
		return fmt.Errorf("current version %q is not valid semver: %w", currentStr, err)
	}

	var newVersion string
	switch release {
	case "major":
		v := currentVer.IncMajor()
		newVersion = v.String()
	case "minor":
		v := currentVer.IncMinor()
		newVersion = v.String()
	case "patch":
		v := currentVer.IncPatch()
		newVersion = v.String()
	default:
		// Treat as explicit version
		v, err := semver.NewVersion(release)
		if err != nil {
			return fmt.Errorf("%q is not a valid release type (major, minor, patch) or semver version: %w", release, err)
		}
		newVersion = v.String()
	}

	// Update version in parsed JSON
	parsed["version"] = newVersion
	updatedData, err := json.MarshalIndent(parsed, "", "  ")
	if err != nil {
		return fmt.Errorf("serializing manifest: %w", err)
	}

	if err := os.WriteFile(manifestPath, append(updatedData, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing manifest.json: %w", err)
	}

	// JSON mode
	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"old_version": currentStr,
			"new_version": newVersion,
			"release":     release,
		})
	}

	// Human mode
	Out.Log("")
	Out.Log("  %s %s %s %s", output.Icons["success"], output.Dim(currentStr), output.Icons["arrow"], output.Cyan(newVersion))
	Out.Log("")

	return nil
}
