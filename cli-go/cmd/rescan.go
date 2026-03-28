package cmd

import (
	"fmt"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var rescanCmd = &cobra.Command{
	Use:   "rescan <name@version>",
	Short: "Trigger a security rescan of a skill version (admin only)",
	Long:  "Request the registry to re-run security scanning on a specific skill version. Requires admin privileges.",
	Args:  cobra.ExactArgs(1),
	RunE:  runRescan,
}

func init() {
	rootCmd.AddCommand(rescanCmd)
}

func runRescan(_ *cobra.Command, args []string) error {
	specifier := args[0]

	// 1. Check auth
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "rescan",
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
				"command": "rescan",
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

	sp := Out.StartSpinner(fmt.Sprintf("Requesting rescan of %s@%s...", name, version))
	resp, err := client.Rescan(name, version)
	output.StopSpinner(sp)

	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "rescan",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			if apiErr.IsNotFound() {
				Out.LogError("%s@%s does not exist in the registry.", name, version)
			} else if apiErr.IsUnauthorized() {
				Out.LogError("Authentication failed. Run %s to re-authenticate.", output.Cyan("spm login"))
			} else if apiErr.StatusCode == 403 {
				Out.LogError("Permission denied. Rescan requires admin privileges.")
			} else {
				Out.LogError("Rescan failed: %s", apiErr.Message)
			}
			return fmt.Errorf("rescan failed: %s", apiErr.Message)
		}
		Out.LogError("Rescan failed: %s", err)
		return fmt.Errorf("rescan failed: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		resp["command"] = "rescan"
		resp["status"] = "success"
		return Out.LogJSON(resp)
	}

	Out.Log("%s Rescan requested for %s@%s", output.Green(output.Icons["success"]),
		output.Cyan(name), version)

	return nil
}
