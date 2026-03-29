package cmd

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/manifest"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/scanner"
	"github.com/skillpkg/spm/internal/signing"
	"github.com/spf13/cobra"
)

var (
	publishNoSign bool
	publishTag    string
)

var publishCmd = &cobra.Command{
	Use:   "publish [path]",
	Short: "Pack and publish a skill to the registry",
	Long:  "Pack the skill in the current directory (or the given path) into a .skl archive and publish it to the registry.",
	Args:  cobra.MaximumNArgs(1),
	RunE:  runPublish,
}

func init() {
	publishCmd.Flags().BoolVar(&publishNoSign, "no-sign", false, "Skip Sigstore signing (publish unsigned)")
	publishCmd.Flags().StringVar(&publishTag, "tag", "", "Version tag (e.g. latest, beta)")
	rootCmd.AddCommand(publishCmd)
}

// publishSignerFactory is overridden in tests to inject a mock signer.
var publishSignerFactory func() signing.Signer

func runPublish(_ *cobra.Command, args []string) error {
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
				"command": "publish",
				"status":  "error",
				"error":   "not_logged_in",
			})
		}
		Out.LogError("Not authenticated. Run %s to log in.", output.Cyan("spm login"))
		return fmt.Errorf("not logged in")
	}

	// 2. Read and validate manifest
	manifestPath := filepath.Join(absDir, "manifest.json")
	mf, err := manifest.LoadFile(manifestPath)
	if err != nil {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "publish",
				"status":  "error",
				"error":   "manifest_read_failed",
				"message": err.Error(),
			})
		}
		Out.LogError("Failed to read manifest.json: %s", err)
		return fmt.Errorf("reading manifest: %w", err)
	}

	if err := manifest.Validate(mf); err != nil {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command": "publish",
				"status":  "error",
				"error":   "validation_failed",
				"message": err.Error(),
			})
		}
		Out.LogError("Manifest validation failed: %s", err)
		return fmt.Errorf("manifest validation: %w", err)
	}

	Out.Log("%s Validating %s@%s...", output.Icons["package"], output.Cyan(mf.Name), mf.Version)

	// 3. Security scan
	Out.Log("%s Running security scan...", output.Icons["lock"])
	scanFiles, err := collectScanFiles(absDir)
	if err != nil {
		Out.LogError("Failed to collect files for scanning: %s", err)
		return fmt.Errorf("collecting scan files: %w", err)
	}

	scanResult := scanner.ScanContent(scanFiles)

	if !scanResult.Passed {
		if Out.Mode == output.ModeJSON {
			return Out.LogJSON(map[string]any{
				"command":  "publish",
				"status":   "blocked",
				"error":    "security_scan_blocked",
				"blocked":  scanResult.Blocked,
				"warnings": scanResult.Warnings,
				"findings": scanResult.Findings,
			})
		}
		Out.LogError("Security scan blocked publish: %d blocking finding(s)", scanResult.Blocked)
		for _, f := range scanResult.Findings {
			if f.Severity == scanner.Block {
				Out.Log("  %s %s (%s) in %s:%d", output.Red(output.Icons["error"]),
					f.PatternName, string(f.Category), f.File, f.Line)
				if f.Fix != "" {
					Out.Log("    Fix: %s", output.Dim(f.Fix))
				}
			}
		}
		return fmt.Errorf("security scan blocked publish")
	}

	if scanResult.Warnings > 0 {
		Out.Log("  %s %d warning(s) found", output.Yellow(output.Icons["warning"]), scanResult.Warnings)
	} else {
		Out.Log("  %s Security scan passed", output.Green(output.Icons["success"]))
	}

	// 4. Pack .skl (tar.gz)
	sp := Out.StartSpinner("Packing skill...")
	sklData, sklFilename, err := packSkill(absDir, mf)
	output.StopSpinner(sp)
	if err != nil {
		Out.LogError("Failed to pack skill: %s", err)
		return fmt.Errorf("packing skill: %w", err)
	}
	Out.Log("  %s Packed %s (%s)", output.Green(output.Icons["success"]), sklFilename, formatBytesInt(len(sklData)))

	// 5. Sign (optional, graceful)
	var sigstoreBundle []byte
	var signStatus string

	if publishNoSign {
		Out.Log("  %s Skipping signing (--no-sign)", output.Yellow(output.Icons["warning"]))
		signStatus = "skipped"
	} else {
		sp = Out.StartSpinner("Signing with Sigstore...")
		var signer signing.Signer
		if publishSignerFactory != nil {
			signer = publishSignerFactory()
		} else {
			signer = signing.NewSigner()
		}
		signResult, signErr := signer.Sign(sklData)
		output.StopSpinner(sp)
		if signErr != nil {
			Out.Log("  %s Signing failed (publishing unsigned): %s", output.Yellow(output.Icons["warning"]), signErr)
			signStatus = "failed"
		} else if signResult != nil {
			sigstoreBundle = []byte(signResult.Bundle)
			signStatus = "signed"
			Out.Log("  %s Signed by %s (Sigstore)", output.Green(output.Icons["success"]),
				output.Green(signResult.SignerIdentity))
		} else {
			Out.Log("  %s Signing unavailable (publishing unsigned)", output.Yellow(output.Icons["warning"]))
			signStatus = "unavailable"
		}
	}

	// 6. Classify category (optional, non-blocking)
	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	skillMD := ""
	skillMDPath := filepath.Join(absDir, "SKILL.md")
	if data, readErr := os.ReadFile(skillMDPath); readErr == nil {
		skillMD = string(data)
	}

	manifestCategory := ""
	if len(mf.Categories) > 0 {
		manifestCategory = mf.Categories[0]
	}

	if skillMD != "" || manifestCategory != "" {
		classifyResult, classifyErr := client.Classify(skillMD, manifestCategory)
		if classifyErr == nil && classifyResult != nil {
			Out.LogVerbose("Category suggestion: %s (confidence: %.1f%%)",
				classifyResult.SuggestedCategory, classifyResult.Confidence*100)
		}
	}

	// 7. Upload
	manifestJSON, err := json.Marshal(mf)
	if err != nil {
		return fmt.Errorf("serializing manifest: %w", err)
	}

	sp = Out.StartSpinner("Publishing to registry...")
	publishResp, err := client.Publish(manifestJSON, bytes.NewReader(sklData), sklFilename, sigstoreBundle)
	output.StopSpinner(sp)
	if err != nil {
		var apiErr *api.APIError
		if isAPIError(err, &apiErr) {
			if Out.Mode == output.ModeJSON {
				return Out.LogJSON(map[string]any{
					"command": "publish",
					"status":  "error",
					"error":   apiErr.Code,
					"message": apiErr.Message,
				})
			}
			if apiErr.IsConflict() {
				Out.LogError("Version %s already exists. Bump the version in manifest.json.", mf.Version)
			} else if apiErr.IsUnauthorized() {
				Out.LogError("Authentication failed. Run %s to re-authenticate.", output.Cyan("spm login"))
			} else if apiErr.IsValidation() {
				Out.LogError("Publish blocked: %s", apiErr.Message)
			} else {
				Out.LogError("Publish failed: %s", apiErr.Message)
			}
			return fmt.Errorf("publish failed: %s", apiErr.Message)
		}
		Out.LogError("Publish failed: %s", err)
		return fmt.Errorf("publish failed: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"command":       "publish",
			"status":        publishResp.Status,
			"name":          publishResp.Name,
			"version":       publishResp.Version,
			"url":           publishResp.URL,
			"checksum":      publishResp.ChecksumSHA256,
			"sign_status":   signStatus,
			"scan_warnings": scanResult.Warnings,
			"scan_blocked":  scanResult.Blocked,
		})
	}

	Out.Log("")
	Out.Log("%s Published %s@%s", output.Green(output.Icons["success"]),
		output.Cyan(publishResp.Name), publishResp.Version)
	if publishResp.URL != "" {
		Out.Log("  %s %s", output.Icons["arrow"], output.Dim(publishResp.URL))
	}
	Out.Log("")

	return nil
}

// collectScanFiles collects .md and .json files from the skill directory for security scanning.
func collectScanFiles(dir string) ([]scanner.File, error) {
	var files []scanner.File
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if ext == ".md" || ext == ".json" || ext == ".txt" || ext == ".yaml" || ext == ".yml" {
			data, readErr := os.ReadFile(filepath.Join(dir, name))
			if readErr != nil {
				continue
			}
			files = append(files, scanner.File{
				Name:    name,
				Content: string(data),
			})
		}
	}
	return files, nil
}

// packSkill creates a tar.gz archive of the skill directory.
func packSkill(dir string, mf *manifest.Manifest) ([]byte, string, error) {
	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, "", err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, infoErr := entry.Info()
		if infoErr != nil {
			continue
		}
		data, readErr := os.ReadFile(filepath.Join(dir, entry.Name()))
		if readErr != nil {
			continue
		}

		hdr := &tar.Header{
			Name: entry.Name(),
			Size: info.Size(),
			Mode: 0o644,
		}
		if writeErr := tw.WriteHeader(hdr); writeErr != nil {
			return nil, "", writeErr
		}
		if _, writeErr := tw.Write(data); writeErr != nil {
			return nil, "", writeErr
		}
	}

	if err := tw.Close(); err != nil {
		return nil, "", err
	}
	if err := gw.Close(); err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("%s-%s.skl", mf.Name, mf.Version)
	return buf.Bytes(), filename, nil
}

// formatBytesInt formats a byte count as a human-readable string.
func formatBytesInt(n int) string {
	if n < 1024 {
		return fmt.Sprintf("%d B", n)
	}
	kb := float64(n) / 1024
	if kb < 1024 {
		return fmt.Sprintf("%.1f KB", kb)
	}
	mb := kb / 1024
	return fmt.Sprintf("%.1f MB", mb)
}
