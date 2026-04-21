package cmd

import (
	"fmt"
	"strings"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var infoCmd = &cobra.Command{
	Use:   "info <@scope/name[@version]>",
	Short: "Show detailed information about a skill",
	Long:  "Display full metadata for a skill from the registry, including author, tags, versions, dependencies, and security info.",
	Args:  cobra.ExactArgs(1),
	RunE:  runInfo,
}

func init() {
	rootCmd.AddCommand(infoCmd)
}

func runInfo(_ *cobra.Command, args []string) error {
	nameArg := args[0]

	// Parse optional @version
	name, version := splitNameVersion(nameArg)

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner(fmt.Sprintf("Fetching info for %s...", nameArg))

	if version != "" {
		verInfo, err := client.GetVersion(name, version)
		output.StopSpinner(sp)
		if err != nil {
			return handleInfoError(err, nameArg)
		}

		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(verInfo)
		}

		Out.Log("")
		Out.Log("  %s %s", output.Icons["package"], output.Bold(fmt.Sprintf("%s@%s", verInfo.Name, verInfo.Version)))
		Out.Log("")
		if verInfo.Yanked {
			Out.Log("  %s %s", output.Icons["warning"], output.Yellow("This version has been yanked"))
		}
		Out.Log("  %-13s%s", "Size:", formatBytes(int64(verInfo.SizeBytes)))
		Out.Log("  %-13s%s", "Checksum:", output.Dim(verInfo.ChecksumSHA256))
		Out.Log("  %-13s%s", "Published:", verInfo.PublishedAt)
		if verInfo.SignerIdentity != "" {
			Out.Log("  %-13s%s", "Signed by:", output.Green(verInfo.SignerIdentity))
		}
		Out.Log("")
		return nil
	}

	info, err := client.Info(name)
	output.StopSpinner(sp)
	if err != nil {
		return handleInfoError(err, nameArg)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(info)
	}

	Out.Log("")
	titleStr := fmt.Sprintf("%s@%s", info.Name, info.LatestVersion)
	if info.Visibility == "private" {
		titleStr += " " + output.Yellow(output.Icons["lock"]+" private")
	}
	Out.Log("  %s %s", output.Icons["package"], output.Bold(titleStr))
	Out.Log("")
	Out.Log("  %s", info.Description)
	Out.Log("")

	// Metadata
	Out.Log("  %-13s@%s (%s)", "Author:", info.Author.Username, trustBadge(info.Author.TrustTier))
	if info.License != "" {
		Out.Log("  %-13s%s", "License:", info.License)
	}
	Out.Log("  %-13s%s", "Category:", info.Category)
	if len(info.Tags) > 0 {
		Out.Log("  %-13s%s", "Tags:", strings.Join(info.Tags, ", "))
	}
	if len(info.Platforms) > 0 {
		Out.Log("  %-13s%s", "Platforms:", formatPlatforms(info.Platforms))
	}
	Out.Log("  %-13s%s total / %s this week", "Downloads:", formatDownloads(info.Downloads), formatDownloads(info.WeeklyDownloads))
	if info.RatingCount > 0 {
		Out.Log("  %-13s%.1f (%d review%s)", "Rating:", info.RatingAvg, info.RatingCount, pluralS(info.RatingCount))
	}
	if info.Repository != "" {
		Out.Log("  %-13s%s", "Repository:", info.Repository)
	}
	Out.Log("  %-13s%s", "Created:", info.CreatedAt)
	Out.Log("  %-13s%s", "Updated:", info.UpdatedAt)

	// Dependencies
	hasDeps := len(info.Dependencies.Skills) > 0 || len(info.Dependencies.System) > 0 || len(info.Dependencies.Packages) > 0
	if hasDeps {
		Out.Log("")
		Out.Log("  Dependencies:")
		for _, d := range info.Dependencies.Skills {
			Out.Log("    skill: %s", d)
		}
		for _, d := range info.Dependencies.System {
			Out.Log("    system: %s", d)
		}
		for _, d := range info.Dependencies.Packages {
			Out.Log("    package: %s", d)
		}
	}

	// Security
	Out.Log("")
	Out.Log("  Security:")
	Out.Log("    Scan status: %s", info.Security.ScanStatus)
	if info.Security.Signed {
		signer := "Sigstore"
		if info.Security.SignerIdentity != "" {
			signer = info.Security.SignerIdentity
		}
		Out.Log("    %s Signed by %s", output.Green(output.Icons["check"]), signer)
	}

	// Versions
	if len(info.Versions) > 0 {
		Out.Log("")
		Out.Log("  Versions:")
		for _, v := range info.Versions {
			Out.Log("    %s  %s", v.Version, output.Dim(v.PublishedAt))
		}
	}

	if info.Deprecated {
		Out.Log("")
		Out.Log("  %s %s", output.Icons["warning"], output.Yellow("This skill is deprecated"))
	}

	Out.Log("")
	Out.Log("  Install: %s", output.Cyan(fmt.Sprintf("spm install %s", info.Name)))
	Out.Log("")

	return nil
}

// splitNameVersion splits "name@version" into name and version parts.
func splitNameVersion(s string) (string, string) {
	// Handle scoped names like @scope/name@version
	atIdx := strings.LastIndex(s, "@")
	if atIdx <= 0 {
		return s, ""
	}
	return s[:atIdx], s[atIdx+1:]
}

func formatPlatforms(platforms []string) string {
	if len(platforms) == 0 {
		return "all"
	}
	if len(platforms) == 1 && platforms[0] == "*" {
		return "all"
	}
	return strings.Join(platforms, ", ")
}

func handleInfoError(err error, name string) error {
	var apiErr *api.APIError
	if isAPIError(err, &apiErr) {
		if apiErr.IsForbidden() {
			scope := extractScope(name)
			Out.LogError("You don't have access to %s", name)
			Out.Log("  This is a private skill. Ask an admin of @%s for access.", scope)
			return fmt.Errorf("access denied: %s", name)
		}
		if apiErr.IsNotFound() {
			if Out.Mode == output.ModeJSON {
				_ = Out.LogJSON(map[string]string{"error": "not_found", "name": name})
				return fmt.Errorf("skill not found: %s", name)
			}
			Out.LogError("Skill not found: %s", name)
			scopeHint(name)
			if apiErr.Suggestion != "" {
				Out.Log("  Did you mean: %s?", output.Cyan(apiErr.Suggestion))
			}
			return fmt.Errorf("skill not found: %s", name)
		}
	}
	return fmt.Errorf("failed to fetch skill info: %w", err)
}

// extractScope returns the org scope from a scoped skill name, or the name itself.
func extractScope(name string) string {
	if strings.HasPrefix(name, "@") {
		if idx := strings.Index(name, "/"); idx > 1 {
			return name[1:idx]
		}
	}
	return name
}
