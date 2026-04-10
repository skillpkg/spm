package cmd

import (
	"fmt"
	"time"

	"github.com/atotto/clipboard"
	"github.com/pkg/browser"
	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

// BrowserOpen is the function used to open URLs in the browser.
// Can be overridden in tests.
var BrowserOpen = browser.OpenURL

// clipboardWrite is the function used to copy text to the clipboard.
// Can be overridden in tests.
var clipboardWrite = clipboard.WriteAll

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with GitHub",
	Long:  "Start the GitHub OAuth device flow to authenticate with the SPM registry.",
	RunE:  runLogin,
}

func init() {
	rootCmd.AddCommand(loginCmd)
}

func runLogin(cmd *cobra.Command, _ []string) error {
	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	// Check if already logged in
	if Cfg.Token != "" {
		user, err := client.Whoami()
		if err == nil {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]string{
					"status":     "already_logged_in",
					"username":   user.Username,
					"trust_tier": user.TrustTier,
				})
			}
			Out.Log("")
			Out.Log("%s Already logged in as %s (GitHub)", output.Icons["info"], output.Bold(user.Username))
			Out.Log("  Trust tier: %s", user.TrustTier)
			Out.Log("")
			Out.Log("To switch accounts, run %s first.", output.Cyan("spm logout"))
			return nil
		}
		// Token expired — continue with login flow
		var apiErr *api.APIError
		if ok := isAPIError(err, &apiErr); ok && apiErr.IsUnauthorized() {
			Out.Log("%s Your session has expired.", output.Icons["warning"])
			Out.Log("")
		}
	}

	// Start device flow
	dcResp, err := client.DeviceCode()
	if err != nil {
		Out.LogError("Could not reach registry: %s", err)
		return fmt.Errorf("failed to start authentication")
	}

	// Try to copy code to clipboard
	copied := clipboardWrite(dcResp.UserCode) == nil

	Out.Log("")
	Out.Log("Opening GitHub for authentication...")
	Out.Log("")
	Out.Log("If your browser didn't open, go to:")
	Out.Log("  %s", output.Cyan(dcResp.VerificationURI))
	Out.Log("")
	if copied {
		Out.Log("And paste the code: %s (copied to clipboard)", output.Bold(dcResp.UserCode))
	} else {
		Out.Log("And enter code: %s", output.Bold(dcResp.UserCode))
	}
	Out.Log("")

	// Try to open browser
	_ = BrowserOpen(dcResp.VerificationURI)

	// Poll for token
	sp := Out.StartSpinner("Waiting for authorization...")

	tokenResp, err := client.PollDeviceFlow(dcResp.DeviceCode, api.DeviceFlowConfig{
		PollInterval: time.Duration(dcResp.Interval) * time.Second,
		ExpiresIn:    time.Duration(dcResp.ExpiresIn) * time.Second,
	})

	output.StopSpinner(sp)

	if err != nil {
		Out.LogError("Authentication failed: %s", err)
		Out.Log("Run %s to try again.", output.Cyan("spm login"))
		return fmt.Errorf("authentication failed")
	}

	// Save token
	Cfg.Token = tokenResp.Token
	if err := config.Save(Cfg); err != nil {
		Out.LogError("Failed to save token: %s", err)
		return fmt.Errorf("failed to save token")
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]string{
			"status":     "authenticated",
			"username":   tokenResp.User.Username,
			"trust_tier": tokenResp.User.TrustTier,
		})
	}

	Out.Log("%s Authenticated as %s (GitHub)", output.Icons["success"], output.Bold(tokenResp.User.Username))
	Out.Log("%s Token saved to %s", output.Icons["success"], output.Dim("~/.spm/config.toml"))
	Out.Log("")
	Out.Log("You can now publish skills. Your trust tier: %s", tokenResp.User.TrustTier)
	Out.Log("To get Verified, link your GitHub and maintain 6 months activity.")

	return nil
}

// isAPIError checks if an error is an *api.APIError and assigns it to target.
func isAPIError(err error, target **api.APIError) bool {
	if e, ok := err.(*api.APIError); ok {
		*target = e
		return true
	}
	return false
}
