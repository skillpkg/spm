package cmd

import (
	"fmt"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var (
	reportReason   string
	reportPriority string
)

var reportCmd = &cobra.Command{
	Use:   "report <name>",
	Short: "Report a skill for policy violations",
	Long:  "Submit a report for a skill that violates registry policies.",
	Args:  cobra.ExactArgs(1),
	RunE:  runReport,
}

func init() {
	reportCmd.Flags().StringVar(&reportReason, "reason", "", "Reason for reporting (required)")
	reportCmd.Flags().StringVar(&reportPriority, "priority", "normal", "Report priority (low, normal, high)")
	_ = reportCmd.MarkFlagRequired("reason")
	rootCmd.AddCommand(reportCmd)
}

func runReport(_ *cobra.Command, args []string) error {
	name := args[0]

	// 1. Check auth
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "report",
				"status":  "error",
				"error":   "not_logged_in",
			})
		}
		Out.LogError("Not authenticated. Run %s to log in.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner(fmt.Sprintf("Submitting report for %s...", name))
	resp, err := client.Report(name, reportReason, reportPriority)
	output.StopSpinner(sp)

	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "report",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			if apiErr.IsNotFound() {
				Out.LogError("Skill %s does not exist in the registry.", name)
			} else if apiErr.IsUnauthorized() {
				Out.LogError("Authentication failed. Run %s to re-authenticate.", output.Cyan("spm login"))
			} else if apiErr.IsRateLimited() {
				Out.LogError("Rate limited. Too many reports submitted. Please try again later.")
			} else {
				Out.LogError("Report failed: %s", apiErr.Message)
			}
			return fmt.Errorf("report failed: %s", apiErr.Message)
		}
		Out.LogError("Report failed: %s", err)
		return fmt.Errorf("report failed: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"command":    "report",
			"status":     "success",
			"id":         resp.ID,
			"skill":      resp.Skill,
			"reason":     reportReason,
			"priority":   reportPriority,
			"created_at": resp.CreatedAt,
		})
	}

	Out.Log("%s Report submitted for %s", output.Green(output.Icons["success"]), output.Cyan(name))
	Out.Log("  Report ID: %s", output.Dim(resp.ID))

	return nil
}
