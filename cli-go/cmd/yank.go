package cmd

import (
	"fmt"
	"strings"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var yankReason string

var yankCmd = &cobra.Command{
	Use:   "yank <name@version>",
	Short: "Yank a specific version from the registry",
	Long:  "Remove a specific skill version from the registry so it can no longer be installed. Existing installs are unaffected.",
	Args:  cobra.ExactArgs(1),
	RunE:  runYank,
}

func init() {
	yankCmd.Flags().StringVar(&yankReason, "reason", "", "Reason for yanking")
	rootCmd.AddCommand(yankCmd)
}

// parseNameVersion splits a "name@version" specifier.
// Handles scoped packages like @scope/name@version.
func parseNameVersion(specifier string) (name, version string, ok bool) {
	// Find the last '@' that is not at position 0 (scoped package prefix)
	atIdx := strings.LastIndex(specifier, "@")
	if atIdx <= 0 {
		return "", "", false
	}
	name = specifier[:atIdx]
	version = specifier[atIdx+1:]
	if name == "" || version == "" {
		return "", "", false
	}
	return name, version, true
}

func runYank(_ *cobra.Command, args []string) error {
	specifier := args[0]

	// 1. Check auth
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "yank",
				"status":  "error",
				"error":   "not_logged_in",
			})
		}
		Out.LogError("Not authenticated. Run %s to log in.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	// 2. Parse name@version
	name, version, ok := parseNameVersion(specifier)
	if !ok {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "yank",
				"status":  "error",
				"error":   "invalid_specifier",
				"message": fmt.Sprintf("expected format: name@version, got: %s", specifier),
			})
		}
		Out.LogError("Invalid specifier: expected name@version (e.g. my-skill@1.2.3)")
		return fmt.Errorf("invalid specifier: %s", specifier)
	}

	// 3. Call API
	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner(fmt.Sprintf("Yanking %s@%s...", name, version))
	resp, err := client.Yank(name, version, yankReason)
	output.StopSpinner(sp)

	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "yank",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			if apiErr.IsNotFound() {
				Out.LogError("%s@%s does not exist in the registry.", name, version)
			} else if apiErr.IsUnauthorized() {
				Out.LogError("Authentication failed. Run %s to re-authenticate.", output.Cyan("spm login"))
			} else {
				Out.LogError("Yank failed: %s", apiErr.Message)
			}
			return fmt.Errorf("yank failed: %s", apiErr.Message)
		}
		Out.LogError("Yank failed: %s", err)
		return fmt.Errorf("yank failed: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"command":   "yank",
			"status":    "success",
			"name":      resp.Name,
			"version":   resp.Version,
			"yanked":    resp.Yanked,
			"reason":    resp.Reason,
			"yanked_at": resp.YankedAt,
		})
	}

	Out.Log("%s Yanked %s@%s", output.Green(output.Icons["success"]),
		output.Cyan(name), version)
	if resp.Reason != "" {
		Out.Log("  Reason: %s", output.Dim(resp.Reason))
	}

	return nil
}
