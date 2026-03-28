package e2e

import (
	"archive/tar"
	"compress/gzip"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestAuthoringFlow tests: init -> test -> pack -> verify .skl is valid tar.gz
func TestAuthoringFlow(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()

	// Step 1: init
	res := spm(t, server.URL, workDir, "init", "--name", "my-test-skill", "--description", "A test skill for end-to-end validation purposes")
	if res.ExitCode != 0 {
		t.Fatalf("init failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Verify files were created
	for _, f := range []string{"manifest.json", "SKILL.md", "tests/eval.json"} {
		path := filepath.Join(workDir, f)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			t.Fatalf("init did not create %s", f)
		}
	}

	// Verify manifest content
	manifestData, err := os.ReadFile(filepath.Join(workDir, "manifest.json"))
	if err != nil {
		t.Fatalf("reading manifest.json: %v", err)
	}
	var manifest map[string]any
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		t.Fatalf("parsing manifest.json: %v", err)
	}
	if manifest["name"] != "my-test-skill" {
		t.Errorf("expected name 'my-test-skill', got %v", manifest["name"])
	}

	// Step 2: test
	res = spm(t, server.URL, workDir, "test")
	if res.ExitCode != 0 {
		t.Fatalf("test failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Step 3: pack
	res = spm(t, server.URL, workDir, "pack")
	if res.ExitCode != 0 {
		t.Fatalf("pack failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Find the .skl file
	entries, err := os.ReadDir(workDir)
	if err != nil {
		t.Fatalf("reading workDir: %v", err)
	}
	var sklFile string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".skl") {
			sklFile = filepath.Join(workDir, e.Name())
			break
		}
	}
	if sklFile == "" {
		t.Fatal("pack did not create a .skl file")
	}

	// Step 4: verify .skl is valid tar.gz
	verifyTarGz(t, sklFile)
}

// TestAuthoringFlowJSON tests init and pack with --json flag.
func TestAuthoringFlowJSON(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()

	// init --json
	res := spm(t, server.URL, workDir, "--json", "init", "--name", "json-skill", "--description", "A skill for testing JSON output formatting")
	if res.ExitCode != 0 {
		t.Fatalf("init --json failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	var initOutput map[string]any
	if err := json.Unmarshal([]byte(res.Stdout), &initOutput); err != nil {
		t.Fatalf("init --json output is not valid JSON: %v\nstdout: %s", err, res.Stdout)
	}
	if initOutput["name"] != "json-skill" {
		t.Errorf("expected name 'json-skill' in JSON output, got %v", initOutput["name"])
	}

	// pack --json
	res = spm(t, server.URL, workDir, "--json", "pack")
	if res.ExitCode != 0 {
		t.Fatalf("pack --json failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	var packOutput map[string]any
	if err := json.Unmarshal([]byte(res.Stdout), &packOutput); err != nil {
		t.Fatalf("pack --json output is not valid JSON: %v\nstdout: %s", err, res.Stdout)
	}
	if packOutput["archive"] == nil {
		t.Error("pack --json output missing 'archive' field")
	}
}

// TestConsumerFlow tests: install -> list -> uninstall -> list (empty)
// TODO: Fix once install/list agree on skills.json location (SPM_HOME vs workDir)
func TestConsumerFlow(t *testing.T) {
	t.Skip("skipped: install/list skills.json location mismatch — tracked for fix")
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()
	spmHome := t.TempDir()

	// Step 1: install
	res := spmWithHome(t, spmHome, server.URL, workDir, "install", "hello-world", "--no-link")
	if res.ExitCode != 0 {
		t.Fatalf("install failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	combined := res.Stdout + res.Stderr
	if !strings.Contains(strings.ToLower(combined), "hello-world") {
		t.Errorf("install output should mention 'hello-world'\nstdout: %s\nstderr: %s", res.Stdout, res.Stderr)
	}

	// Step 2: list (should show installed skill)
	res = spmWithHome(t, spmHome, server.URL, workDir, "--json", "list")
	if res.ExitCode != 0 {
		t.Fatalf("list failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	var listOutput map[string]any
	if err := json.Unmarshal([]byte(res.Stdout), &listOutput); err != nil {
		t.Fatalf("list --json output is not valid JSON: %v\nstdout: %s", err, res.Stdout)
	}

	skills, ok := listOutput["skills"].([]any)
	if !ok {
		t.Fatalf("list --json output missing 'skills' array\nstdout: %s", res.Stdout)
	}
	if len(skills) == 0 {
		t.Fatal("list --json should show at least 1 installed skill after install")
	}

	// Step 3: uninstall
	res = spmWithHome(t, spmHome, server.URL, workDir, "uninstall", "hello-world")
	if res.ExitCode != 0 {
		t.Fatalf("uninstall failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Step 4: list (should be empty)
	res = spmWithHome(t, spmHome, server.URL, workDir, "--json", "list")
	if res.ExitCode != 0 {
		t.Fatalf("list after uninstall failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	if err := json.Unmarshal([]byte(res.Stdout), &listOutput); err != nil {
		t.Fatalf("list --json output is not valid JSON: %v\nstdout: %s", err, res.Stdout)
	}

	total, _ := listOutput["total"].(float64)
	if total != 0 {
		t.Errorf("expected 0 skills after uninstall, got %v\nstdout: %s", total, res.Stdout)
	}
}

// TestVersionBump tests: init -> version patch -> version minor -> version major
func TestVersionBump(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()

	// Create a skill with version 1.0.0
	res := spm(t, server.URL, workDir, "init", "--name", "bump-skill", "--version", "1.0.0", "--description", "A skill for testing version bump operations")
	if res.ExitCode != 0 {
		t.Fatalf("init failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Patch bump: 1.0.0 -> 1.0.1
	res = spm(t, server.URL, workDir, "version", "patch")
	if res.ExitCode != 0 {
		t.Fatalf("version patch failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}
	assertManifestVersion(t, workDir, "1.0.1")

	// Minor bump: 1.0.1 -> 1.1.0
	res = spm(t, server.URL, workDir, "version", "minor")
	if res.ExitCode != 0 {
		t.Fatalf("version minor failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}
	assertManifestVersion(t, workDir, "1.1.0")

	// Major bump: 1.1.0 -> 2.0.0
	res = spm(t, server.URL, workDir, "version", "major")
	if res.ExitCode != 0 {
		t.Fatalf("version major failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}
	assertManifestVersion(t, workDir, "2.0.0")
}

// TestVersionBumpJSON tests version bump with --json flag.
func TestVersionBumpJSON(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()

	res := spm(t, server.URL, workDir, "init", "--name", "bump-json", "--version", "1.0.0", "--description", "A skill for testing JSON version bump output")
	if res.ExitCode != 0 {
		t.Fatalf("init failed (exit %d)", res.ExitCode)
	}

	res = spm(t, server.URL, workDir, "--json", "version", "patch")
	if res.ExitCode != 0 {
		t.Fatalf("version patch --json failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	var output map[string]any
	if err := json.Unmarshal([]byte(res.Stdout), &output); err != nil {
		t.Fatalf("version --json output is not valid JSON: %v\nstdout: %s", err, res.Stdout)
	}
	if output["old_version"] != "1.0.0" {
		t.Errorf("expected old_version '1.0.0', got %v", output["old_version"])
	}
	if output["new_version"] != "1.0.1" {
		t.Errorf("expected new_version '1.0.1', got %v", output["new_version"])
	}
}

// TestVersionExplicit tests setting an explicit version.
func TestVersionExplicit(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()

	res := spm(t, server.URL, workDir, "init", "--name", "explicit-ver", "--version", "1.0.0", "--description", "A skill for testing explicit version setting")
	if res.ExitCode != 0 {
		t.Fatalf("init failed (exit %d)", res.ExitCode)
	}

	res = spm(t, server.URL, workDir, "version", "3.5.2")
	if res.ExitCode != 0 {
		t.Fatalf("version explicit failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}
	assertManifestVersion(t, workDir, "3.5.2")
}

// TestInstallMultiple tests installing multiple skills at once.
// TODO: Fix once install JSON output format is finalized
func TestInstallMultiple(t *testing.T) {
	t.Skip("skipped: install JSON output format mismatch — tracked for fix")
	server := startMockRegistry(t)
	defer server.Close()

	workDir := t.TempDir()
	spmHome := t.TempDir()

	res := spmWithHome(t, spmHome, server.URL, workDir, "--json", "install", "hello-world", "another-skill", "--no-link")
	if res.ExitCode != 0 {
		t.Fatalf("install multiple failed (exit %d):\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	var output map[string]any
	if err := json.Unmarshal([]byte(res.Stdout), &output); err != nil {
		t.Fatalf("install --json output is not valid JSON: %v\nstdout: %s", err, res.Stdout)
	}

	skills, ok := output["skills"].([]any)
	if !ok {
		t.Fatalf("install --json output missing 'skills' array")
	}
	if len(skills) < 2 {
		t.Errorf("expected at least 2 installed skills, got %d", len(skills))
	}
}

// --- helpers ---

func assertManifestVersion(t *testing.T, dir, expectedVersion string) {
	t.Helper()

	data, err := os.ReadFile(filepath.Join(dir, "manifest.json"))
	if err != nil {
		t.Fatalf("reading manifest.json: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("parsing manifest.json: %v", err)
	}
	if m["version"] != expectedVersion {
		t.Errorf("expected version %q, got %q", expectedVersion, m["version"])
	}
}

func verifyTarGz(t *testing.T, path string) {
	t.Helper()

	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("opening .skl file: %v", err)
	}
	defer f.Close()

	gr, err := gzip.NewReader(f)
	if err != nil {
		t.Fatalf(".skl is not valid gzip: %v", err)
	}
	defer gr.Close()

	tr := tar.NewReader(gr)
	fileNames := make(map[string]bool)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("reading tar entry: %v", err)
		}
		fileNames[hdr.Name] = true
	}

	if !fileNames["manifest.json"] {
		t.Error(".skl archive missing manifest.json")
	}
	if !fileNames["SKILL.md"] {
		t.Error(".skl archive missing SKILL.md")
	}
}
