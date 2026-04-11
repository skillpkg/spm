package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/signing"
	"github.com/spf13/cobra"
)

// VerifierFactory creates a Verifier. Can be overridden in tests.
var VerifierFactory = func() signing.Verifier {
	return &signing.DefaultVerifier{}
}

var verifyCmd = &cobra.Command{
	Use:   "verify <@scope/name>",
	Short: "Verify the Sigstore signature of an installed skill",
	Long: `Verify the Sigstore signature of an installed skill package.

Reads the signature bundle from the skill's cache directory and verifies
it against the cached .skl archive. Reports the signer identity and
verification status.`,
	Args: cobra.ExactArgs(1),
	RunE: runVerify,
}

func init() {
	rootCmd.AddCommand(verifyCmd)
}

func runVerify(cmd *cobra.Command, args []string) error {
	name := args[0]

	// Find the installed version from skills-lock.json
	version, err := getInstalledVersion(name)
	if err != nil || version == "" {
		Out.LogError("skill not installed: %s", name)
		scopeHint(name)
		Out.Log("  Run %s first.", output.Cyan(fmt.Sprintf("spm install %s", name)))
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "verify",
				"name":    name,
				"error":   "skill not installed",
			})
		}
		return fmt.Errorf("skill not installed: %s", name)
	}

	// Locate the cached .skl file
	spmHome := getSPMHome()
	sklPath := filepath.Join(spmHome, "cache", name, version, fmt.Sprintf("%s-%s.skl", name, version))

	if _, err := os.Stat(sklPath); err != nil {
		Out.LogError("package not cached: %s-%s.skl", name, version)
		Out.Log("  Run %s to re-download.", output.Cyan(fmt.Sprintf("spm install %s", name)))
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "verify",
				"name":    name,
				"version": version,
				"error":   "package not cached",
			})
		}
		return fmt.Errorf("package not cached")
	}

	// Read the .skl file
	data, err := os.ReadFile(sklPath)
	if err != nil {
		Out.LogError("failed to read package: %s", err)
		return fmt.Errorf("failed to read package: %w", err)
	}

	// Locate the signature bundle
	bundlePath := filepath.Join(spmHome, "cache", name, version, "signature.sigstore")
	bundleJSON, err := os.ReadFile(bundlePath)
	if err != nil {
		// No signature found -- unsigned package
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command":  "verify",
				"name":     name,
				"version":  version,
				"signed":   false,
				"verified": false,
				"message":  "no signature found",
			})
		}

		Out.Log("%s %s@%s — No signature found",
			output.Icons["warning"],
			output.Cyan(name),
			output.Green(version))
		Out.Log("  This package was published without a Sigstore signature.")
		return nil
	}

	// Verify the signature
	Out.LogVerbose("verifying %s@%s...", name, version)
	sp := Out.StartSpinner("Verifying signature...")

	v := VerifierFactory()
	result, err := v.Verify(data, bundleJSON)
	output.StopSpinner(sp)

	if err != nil {
		Out.LogError("verification error: %s", err)
		return fmt.Errorf("verification error: %w", err)
	}

	if result.Verified {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command":  "verify",
				"name":     name,
				"version":  version,
				"signed":   true,
				"verified": true,
				"signer":   result.SignerIdentity,
			})
		}

		Out.Log("%s Signed by %s (Sigstore)",
			output.Icons["success"],
			output.Cyan(result.SignerIdentity))
	} else {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command":  "verify",
				"name":     name,
				"version":  version,
				"signed":   true,
				"verified": false,
				"error":    result.Error,
			})
		}

		Out.LogError("signature verification failed")
		if result.Error != "" {
			Out.Log("  %s", result.Error)
		}
		return fmt.Errorf("signature verification failed")
	}

	return nil
}

// getInstalledVersion reads skills-lock.json to find the installed version of a skill.
func getInstalledVersion(name string) (string, error) {
	spmHome := getSPMHome()
	lockPaths := []string{
		filepath.Join(".", "skills-lock.json"),
		filepath.Join(spmHome, "skills-lock.json"),
	}

	for _, lockPath := range lockPaths {
		data, err := os.ReadFile(lockPath)
		if err != nil {
			continue
		}

		var lock struct {
			Skills map[string]struct {
				Version string `json:"version"`
			} `json:"skills"`
		}
		if err := json.Unmarshal(data, &lock); err != nil {
			continue
		}

		if skill, ok := lock.Skills[name]; ok {
			return skill.Version, nil
		}
	}

	return "", fmt.Errorf("skill %s not found in any skills-lock.json", name)
}

// getSPMHome returns the SPM home directory, respecting the SPM_HOME env var.
func getSPMHome() string {
	if home := os.Getenv("SPM_HOME"); home != "" {
		return home
	}
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".", ".spm")
	}
	return filepath.Join(homeDir, ".spm")
}
