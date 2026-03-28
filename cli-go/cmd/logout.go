package cmd

import (
	"fmt"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Remove saved authentication token",
	Long:  "Clear the saved authentication token from ~/.spm/config.toml and revoke it on the server.",
	RunE:  runLogout,
}

func init() {
	rootCmd.AddCommand(logoutCmd)
}

func runLogout(cmd *cobra.Command, _ []string) error {
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]string{"status": "not_logged_in"})
		}
		Out.LogError("Not logged in.")
		Out.Log("Run %s to authenticate with GitHub.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	// Attempt to invalidate token on server (non-fatal if it fails)
	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)
	_ = client.Logout()

	// Remove token locally
	Cfg.Token = ""
	if err := config.Save(Cfg); err != nil {
		Out.LogError("Failed to save config: %s", err)
		return fmt.Errorf("failed to clear token")
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]string{"status": "logged_out"})
	}

	Out.Log("")
	Out.Log("%s Logged out. Token removed from %s.", output.Icons["success"], output.Dim("~/.spm/config.toml"))
	Out.Log("")
	Out.Log("You can still search and install skills.")
	Out.Log("Publishing requires %s.", output.Cyan("spm login"))

	return nil
}
