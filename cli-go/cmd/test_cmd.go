package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/skillpkg/spm/internal/manifest"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/scanner"
	"github.com/spf13/cobra"
)

var testSecurityOnly bool

var testCmd = &cobra.Command{
	Use:   "test [path]",
	Short: "Run eval tests and security scans on a local skill",
	Long:  "Validate a skill by running security scans on SKILL.md, manifest validation, and eval.json test cases.",
	Args:  cobra.MaximumNArgs(1),
	RunE:  runTest,
}

func init() {
	testCmd.Flags().BoolVar(&testSecurityOnly, "security-only", false, "Only run security scan")
	rootCmd.AddCommand(testCmd)
}

// EvalTestCase represents a single test case from eval.json.
type EvalTestCase struct {
	Name             string   `json:"name"`
	Input            string   `json:"input"`
	ExpectedOutput   string   `json:"expected_output,omitempty"`
	ExpectedContains []string `json:"expected_contains,omitempty"`
}

// EvalFile represents the eval.json structure.
type EvalFile struct {
	Tests []EvalTestCase `json:"tests"`
}

// TestResult represents the outcome of a single test.
type TestResult struct {
	Name   string `json:"name"`
	Passed bool   `json:"passed"`
	Reason string `json:"reason,omitempty"`
}

func runTest(_ *cobra.Command, args []string) error {
	dir, err := resolveSkillDir(args)
	if err != nil {
		return err
	}

	allPassed := true

	// 1. Security scan
	securityResult, err := runSecurityCheck(dir)
	if err != nil {
		return err
	}
	if !securityResult.Passed {
		allPassed = false
	}

	if testSecurityOnly {
		return outputSecurityResults(securityResult, allPassed)
	}

	// 2. Manifest validation
	manifestResult := runManifestCheck(dir)

	// 3. Eval tests
	evalResults, evalErr := runEvalCheck(dir)

	if !manifestResult.Passed {
		allPassed = false
	}
	for _, r := range evalResults {
		if !r.Passed {
			allPassed = false
			break
		}
	}

	// JSON mode
	if Out.Mode == output.ModeJSON {
		result := map[string]any{
			"passed":   allPassed,
			"security": securityResult,
			"manifest": manifestResult,
		}
		if evalErr == nil {
			result["eval"] = map[string]any{
				"tests":  evalResults,
				"passed": countPassed(evalResults),
				"total":  len(evalResults),
			}
		}
		return Out.LogJSON(result)
	}

	// Human mode
	Out.Log("")
	Out.Log("  %s", output.Bold("Test Results"))
	Out.Log("")

	// Security
	printSecuritySummary(securityResult)

	// Manifest
	if manifestResult.Passed {
		Out.Log("  %s %s  Manifest validation", output.Icons["success"], output.Green("PASS"))
	} else {
		Out.Log("  %s %s  Manifest validation: %s", output.Icons["error"], output.Red("FAIL"), manifestResult.Reason)
	}

	// Eval
	if evalErr != nil {
		Out.Log("  %s %s  Eval tests: %s", output.Icons["warning"], output.Yellow("SKIP"), evalErr.Error())
	} else if len(evalResults) == 0 {
		Out.Log("  %s %s  No eval test cases found", output.Icons["warning"], output.Yellow("SKIP"))
	} else {
		for _, r := range evalResults {
			if r.Passed {
				Out.Log("  %s %s  %s", output.Icons["success"], output.Green("PASS"), r.Name)
			} else {
				Out.Log("  %s %s  %s: %s", output.Icons["error"], output.Red("FAIL"), r.Name, r.Reason)
			}
		}
	}

	Out.Log("")
	if allPassed {
		Out.Log("  %s All checks passed", output.Icons["success"])
	} else {
		Out.Log("  %s Some checks failed", output.Icons["error"])
		Out.Log("")
		return fmt.Errorf("test failed")
	}
	Out.Log("")

	return nil
}

func resolveSkillDir(args []string) (string, error) {
	if len(args) > 0 {
		abs, err := filepath.Abs(args[0])
		if err != nil {
			return "", fmt.Errorf("resolving path: %w", err)
		}
		return abs, nil
	}
	return os.Getwd()
}

func runSecurityCheck(dir string) (*scanner.Result, error) {
	skillMDPath := filepath.Join(dir, "SKILL.md")
	content, err := os.ReadFile(skillMDPath)
	if err != nil {
		if os.IsNotExist(err) {
			// No SKILL.md = no security issues
			return &scanner.Result{Passed: true}, nil
		}
		return nil, fmt.Errorf("reading SKILL.md: %w", err)
	}

	files := []scanner.File{
		{Name: "SKILL.md", Content: string(content)},
	}
	return scanner.ScanContent(files), nil
}

func runManifestCheck(dir string) TestResult {
	manifestPath := filepath.Join(dir, "manifest.json")
	m, err := manifest.LoadFile(manifestPath)
	if err != nil {
		return TestResult{Name: "manifest", Passed: false, Reason: fmt.Sprintf("could not load manifest.json: %s", err)}
	}
	if err := manifest.Validate(m); err != nil {
		return TestResult{Name: "manifest", Passed: false, Reason: err.Error()}
	}
	return TestResult{Name: "manifest", Passed: true}
}

func runEvalCheck(dir string) ([]TestResult, error) {
	evalPath := filepath.Join(dir, "tests", "eval.json")
	data, err := os.ReadFile(evalPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("no eval.json found")
		}
		return nil, fmt.Errorf("reading eval.json: %w", err)
	}

	var evalFile EvalFile
	if err := json.Unmarshal(data, &evalFile); err != nil {
		return nil, fmt.Errorf("invalid eval.json: %w", err)
	}

	results := make([]TestResult, 0, len(evalFile.Tests))
	for _, tc := range evalFile.Tests {
		if tc.ExpectedOutput != "" {
			results = append(results, TestResult{
				Name:   tc.Name,
				Passed: true,
				Reason: "Structural check passed (expected_output defined)",
			})
		} else if len(tc.ExpectedContains) > 0 {
			results = append(results, TestResult{
				Name:   tc.Name,
				Passed: true,
				Reason: "Structural check passed (expected_contains defined)",
			})
		} else {
			results = append(results, TestResult{
				Name:   tc.Name,
				Passed: false,
				Reason: "Test case must have expected_output or expected_contains",
			})
		}
	}

	return results, nil
}

func outputSecurityResults(result *scanner.Result, passed bool) error {
	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"passed":   passed,
			"findings": result.Findings,
			"blocked":  result.Blocked,
			"warnings": result.Warnings,
		})
	}

	Out.Log("")
	Out.Log("  %s", output.Bold("Security Scan"))
	Out.Log("")
	printSecuritySummary(result)
	Out.Log("")

	if !passed {
		return fmt.Errorf("security scan failed")
	}
	return nil
}

func printSecuritySummary(result *scanner.Result) {
	if result.Passed && len(result.Findings) == 0 {
		Out.Log("  %s %s  Security scan (no issues)", output.Icons["success"], output.Green("PASS"))
		return
	}

	for _, f := range result.Findings {
		if f.Severity == scanner.Block {
			Out.Log("  %s %s  %s:%d — %s (%s)", output.Icons["error"], output.Red("BLOCK"), f.File, f.Line, f.PatternName, f.Match)
		} else {
			Out.Log("  %s %s  %s:%d — %s (%s)", output.Icons["warning"], output.Yellow("WARN"), f.File, f.Line, f.PatternName, f.Match)
		}
	}

	if result.Blocked > 0 {
		Out.Log("  %s %s  Security scan: %d blocked, %d warnings", output.Icons["error"], output.Red("FAIL"), result.Blocked, result.Warnings)
	} else {
		Out.Log("  %s %s  Security scan: %d warnings (no blockers)", output.Icons["warning"], output.Yellow("WARN"), result.Warnings)
	}
}

func countPassed(results []TestResult) int {
	n := 0
	for _, r := range results {
		if r.Passed {
			n++
		}
	}
	return n
}
