package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/signing"
	"github.com/spf13/cobra"
)

// SignerFactory creates a Signer. Can be overridden in tests.
var SignerFactory = func() signing.Signer {
	return signing.NewSigner()
}

var signCmd = &cobra.Command{
	Use:   "sign <file.skl>",
	Short: "Sign a .skl archive with Sigstore",
	Long: `Sign a skill package archive using Sigstore keyless signing.

In CI environments (GitHub Actions, GitLab CI), signing uses OIDC
tokens automatically. In interactive mode, opens a browser for
OAuth authentication.

The signature bundle is written to <file>.sigstore.json.`,
	Args: cobra.ExactArgs(1),
	RunE: runSign,
}

func init() {
	rootCmd.AddCommand(signCmd)
}

func runSign(cmd *cobra.Command, args []string) error {
	filePath := args[0]

	// Validate file exists and has .skl extension
	if !strings.HasSuffix(filePath, ".skl") {
		Out.LogError("file must have .skl extension: %s", filePath)
		return fmt.Errorf("file must have .skl extension: %s", filePath)
	}

	info, err := os.Stat(filePath)
	if err != nil {
		Out.LogError("cannot access file: %s", err)
		return fmt.Errorf("cannot access file: %w", err)
	}
	if info.IsDir() {
		Out.LogError("path is a directory, not a file: %s", filePath)
		return fmt.Errorf("path is a directory: %s", filePath)
	}

	// Read the file
	data, err := os.ReadFile(filePath)
	if err != nil {
		Out.LogError("failed to read file: %s", err)
		return fmt.Errorf("failed to read file: %w", err)
	}

	// Detect environment
	env := signing.DetectCIEnv()
	if env != signing.EnvUnknown {
		Out.LogVerbose("detected CI environment: %s", env)
	}

	// Create signer and sign
	s := SignerFactory()
	sp := Out.StartSpinner("Signing with Sigstore...")
	result, err := s.Sign(data)
	output.StopSpinner(sp)

	if err != nil {
		Out.LogError("signing failed: %s", err)
		return fmt.Errorf("signing failed: %w", err)
	}

	if result == nil {
		// Graceful failure -- signing did not succeed but did not error either
		Out.Log("%s Signing skipped (could not authenticate with Sigstore)", output.Icons["warning"])
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "sign",
				"file":    filePath,
				"signed":  false,
				"message": "signing skipped",
			})
		}
		return nil
	}

	// Write the bundle to <file>.sigstore.json
	bundlePath := filePath + ".sigstore.json"

	// Pretty-print the bundle JSON
	var prettyBundle json.RawMessage
	if err := json.Unmarshal([]byte(result.Bundle), &prettyBundle); err == nil {
		indented, err := json.MarshalIndent(prettyBundle, "", "  ")
		if err == nil {
			result.Bundle = string(indented)
		}
	}

	if err := os.WriteFile(bundlePath, []byte(result.Bundle), 0644); err != nil {
		Out.LogError("failed to write bundle: %s", err)
		return fmt.Errorf("failed to write bundle: %w", err)
	}

	// Output
	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"command": "sign",
			"file":    filePath,
			"bundle":  bundlePath,
			"signed":  true,
			"signer":  result.SignerIdentity,
		})
	}

	Out.Log("%s Signed %s", output.Icons["success"], output.Green(filepath.Base(filePath)))
	Out.Log("  %s Signer: %s", output.Icons["key"], output.Cyan(result.SignerIdentity))
	Out.Log("  %s Bundle: %s", output.Icons["arrow"], bundlePath)

	return nil
}
