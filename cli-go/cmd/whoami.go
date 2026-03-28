package cmd

import (
	"fmt"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Display the currently logged-in user",
	Long:  "Show the username, GitHub login, trust tier, and other details for the authenticated user.",
	RunE:  runWhoami,
}

func init() {
	rootCmd.AddCommand(whoamiCmd)
}

func runWhoami(cmd *cobra.Command, _ []string) error {
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			_ = Out.LogJSON(map[string]string{"error": "not_logged_in"})
			return fmt.Errorf("not logged in")
		}
		Out.LogError("Not logged in.")
		Out.Log("Run %s to authenticate with GitHub.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)
	user, err := client.Whoami()
	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if apiErr.IsUnauthorized() {
				if Out.Mode == output.ModeJSON {
					_ = Out.LogJSON(map[string]string{"error": "token_expired"})
					return fmt.Errorf("session expired")
				}
				Out.LogError("Session expired.")
				Out.Log("Your authentication token is no longer valid.")
				Out.Log("Run %s to re-authenticate.", output.Cyan("spm login"))
				return fmt.Errorf("session expired")
			}
			Out.LogError("Could not reach registry: %s", apiErr.Message)
			return fmt.Errorf("API error: %s", apiErr.Message)
		}
		return err
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"username":         user.Username,
			"github":           user.GithubLogin,
			"email":            user.Email,
			"trust_tier":       user.TrustTier,
			"registered_at":    user.CreatedAt,
			"skills_published": user.SkillsPublished,
			"registry":         Cfg.RegistryURL(),
		})
	}

	Out.Log("")
	Out.Log("%s", output.Bold(user.Username))
	Out.Log("  GitHub:     github.com/%s", user.GithubLogin)
	if user.Email != "" {
		Out.Log("  Email:      %s", user.Email)
	}
	Out.Log("  Trust tier: %s", user.TrustTier)
	Out.Log("  Registered: %s", user.CreatedAt)
	Out.Log("  Published:  %d skills", user.SkillsPublished)
	Out.Log("  Registry:   %s", output.Dim(Cfg.RegistryURL()))

	return nil
}
