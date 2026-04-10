package cmd

import (
	"fmt"
	"path/filepath"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/manifest"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/signing"
	"github.com/spf13/cobra"
)

// SignerFactory creates a Signer. Can be overridden in tests.
var SignerFactory = func() signing.Signer {
	return signing.NewSigner()
}

var signCmd = &cobra.Command{
	Use:   "sign [path]",
	Short: "Sign an already-published skill with Sigstore",
	Long: `Sign a published skill version using Sigstore keyless signing.

Downloads the published .skl archive from the registry, signs it, and
uploads the signature. This ensures the signature matches the exact
bytes users download.

In CI environments (GitHub Actions, GitLab CI), signing uses OIDC
tokens automatically. In interactive mode, opens a browser for
OAuth authentication.

Run from a skill directory containing manifest.json, or pass the path.`,
	Args: cobra.MaximumNArgs(1),
	RunE: runSign,
}

func init() {
	rootCmd.AddCommand(signCmd)
}

func runSign(cmd *cobra.Command, args []string) error {
	// Determine skill directory
	skillDir := "."
	if len(args) > 0 {
		skillDir = args[0]
	}
	absDir, err := filepath.Abs(skillDir)
	if err != nil {
		return fmt.Errorf("resolving path: %w", err)
	}

	// 1. Check auth
	if Cfg.Token == "" {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "sign",
				"status":  "error",
				"error":   "not_logged_in",
			})
		}
		Out.LogError("Not authenticated. Run %s to log in.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	// 2. Read manifest to get name + version
	manifestPath := filepath.Join(absDir, "manifest.json")
	mf, err := manifest.LoadFile(manifestPath)
	if err != nil {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "sign",
				"status":  "error",
				"error":   "manifest_read_failed",
				"message": err.Error(),
			})
		}
		Out.LogError("Failed to read manifest.json: %s", err)
		return fmt.Errorf("reading manifest: %w", err)
	}

	Out.Log("%s Signing %s@%s...", output.Icons["lock"], output.Cyan(mf.Name), mf.Version)

	// 3. Download the published .skl from the registry
	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner("Downloading published package...")
	sklData, err := client.Download(mf.Name, mf.Version)
	output.StopSpinner(sp)
	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "sign",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			if apiErr.IsNotFound() {
				Out.LogError("Version %s@%s is not published. Publish first with %s.",
					mf.Name, mf.Version, output.Cyan("spm publish"))
			} else {
				Out.LogError("Download failed: %s", apiErr.Message)
			}
			return fmt.Errorf("download failed: %s", apiErr.Message)
		}
		Out.LogError("Failed to download package: %s", err)
		return fmt.Errorf("download failed: %w", err)
	}
	Out.Log("  %s Downloaded %s (%s)", output.Green(output.Icons["success"]),
		fmt.Sprintf("%s-%s.skl", mf.Name, mf.Version), formatBytesInt(len(sklData)))

	// 4. Sign the downloaded bytes
	sp = Out.StartSpinner("Signing with Sigstore...")
	signer := SignerFactory()
	signResult, signErr := signer.Sign(sklData)
	output.StopSpinner(sp)

	if signErr != nil {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "sign",
				"status":  "error",
				"error":   "signing_failed",
				"message": signErr.Error(),
			})
		}
		Out.LogError("Signing failed: %s", signErr)
		return fmt.Errorf("signing failed: %w", signErr)
	}

	if signResult == nil {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "sign",
				"status":  "error",
				"error":   "signing_unavailable",
				"message": "could not authenticate with Sigstore",
			})
		}
		Out.LogError("Signing unavailable (could not authenticate with Sigstore)")
		return fmt.Errorf("signing unavailable")
	}

	Out.Log("  %s Signed by %s (Sigstore)", output.Green(output.Icons["success"]),
		output.Green(signResult.SignerIdentity))

	// 5. Upload signature to registry
	sp = Out.StartSpinner("Uploading signature...")
	attachResp, err := client.AttachSignature(mf.Name, mf.Version, []byte(signResult.Bundle), signResult.SignerIdentity)
	output.StopSpinner(sp)

	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "sign",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			Out.LogError("Failed to upload signature: %s", apiErr.Message)
			return fmt.Errorf("upload failed: %s", apiErr.Message)
		}
		Out.LogError("Failed to upload signature: %s", err)
		return fmt.Errorf("upload failed: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"command": "sign",
			"status":  "signed",
			"name":    attachResp.Name,
			"version": attachResp.Version,
			"signer":  attachResp.SignerIdentity,
		})
	}

	Out.Log("")
	Out.Log("%s Signature attached to %s@%s", output.Green(output.Icons["success"]),
		output.Cyan(attachResp.Name), attachResp.Version)

	return nil
}
