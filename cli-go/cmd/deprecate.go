package cmd

import (
	"fmt"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var (
	deprecateMessage string
	deprecateUndo    bool
)

var deprecateCmd = &cobra.Command{
	Use:   "deprecate <@scope/name>",
	Short: "Deprecate a skill (or undo with --undo)",
	Long:  "Mark a skill as deprecated with an optional message. Use --undo to remove deprecation.",
	Args:  cobra.ExactArgs(1),
	RunE:  runDeprecate,
}

func init() {
	deprecateCmd.Flags().StringVar(&deprecateMessage, "message", "", "Deprecation message shown to users")
	deprecateCmd.Flags().BoolVar(&deprecateUndo, "undo", false, "Remove deprecation")
	rootCmd.AddCommand(deprecateCmd)
}

func runDeprecate(_ *cobra.Command, args []string) error {
	name := args[0]

	// 1. Check auth
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "deprecate",
				"status":  "error",
				"error":   "not_logged_in",
			})
		}
		Out.LogError("Not authenticated. Run %s to log in.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	// 2. Determine deprecate vs undo
	deprecated := !deprecateUndo
	msg := deprecateMessage
	if !deprecated {
		msg = ""
	} else if msg == "" {
		msg = "This skill has been deprecated."
	}

	action := "Deprecating"
	if !deprecated {
		action = "Removing deprecation for"
	}

	sp := Out.StartSpinner(fmt.Sprintf("%s %s...", action, name))
	resp, err := client.Deprecate(name, deprecated, msg)
	output.StopSpinner(sp)

	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "deprecate",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			if apiErr.IsNotFound() {
				Out.LogError("Skill %s does not exist in the registry.", name)
				scopeHint(name)
			} else if apiErr.IsUnauthorized() {
				Out.LogError("Authentication failed. Run %s to re-authenticate.", output.Cyan("spm login"))
			} else {
				Out.LogError("%s failed: %s", action, apiErr.Message)
			}
			return fmt.Errorf("%s failed: %s", action, apiErr.Message)
		}
		Out.LogError("%s failed: %s", action, err)
		return fmt.Errorf("%s failed: %w", action, err)
	}

	if Out.Mode == output.ModeJSON {
		result := map[string]any{
			"command":    "deprecate",
			"status":     "success",
			"name":       resp.Name,
			"deprecated": resp.Deprecated,
			"updated_at": resp.UpdatedAt,
		}
		if resp.DeprecatedMsg != "" {
			result["message"] = resp.DeprecatedMsg
		}
		return Out.LogJSON(result)
	}

	if deprecated {
		Out.Log("%s Deprecated %s", output.Green(output.Icons["success"]), output.Cyan(name))
		if msg != "" {
			Out.Log("  Message: %s", output.Dim(msg))
		}
	} else {
		Out.Log("%s Un-deprecated %s", output.Green(output.Icons["success"]), output.Cyan(name))
	}

	return nil
}
