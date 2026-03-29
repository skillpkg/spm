package e2e

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
)

// binaryPath is set in TestMain after building.
var binaryPath string

// TestMain compiles the spm binary once before all tests, cleans up after.
func TestMain(m *testing.M) {
	tmpDir, err := os.MkdirTemp("", "spm-e2e-bin-*")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create temp dir: %v\n", err)
		os.Exit(1)
	}

	binName := "spm"
	if runtime.GOOS == "windows" {
		binName = "spm.exe"
	}
	binaryPath = filepath.Join(tmpDir, binName)

	// Build the binary from the module root (parent of e2e/).
	moduleRoot := filepath.Join(mustCwd(), "..")
	buildCmd := exec.Command("go", "build", "-ldflags", "-X github.com/skillpkg/spm/cmd.Version=0.0.1-test", "-o", binaryPath, ".")
	buildCmd.Dir = moduleRoot
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "failed to build spm binary: %v\n", err)
		_ = os.RemoveAll(tmpDir)
		os.Exit(1)
	}

	code := m.Run()

	_ = os.RemoveAll(tmpDir)
	os.Exit(code)
}

func mustCwd() string {
	dir, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	return dir
}

// spmResult holds the output of running the spm binary.
type spmResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

// spm runs the compiled binary with the given args.
// It sets SPM_HOME to a per-test temp dir and SPM_REGISTRY to registryURL.
// workDir is the working directory for the command (use "" for default).
func spm(t *testing.T, registryURL, workDir string, args ...string) spmResult {
	t.Helper()
	return spmWithHome(t, t.TempDir(), registryURL, workDir, args...)
}

// spmWithHome runs the binary with an explicit SPM_HOME directory.
// Use this for multi-step tests that need persistent state across calls.
func spmWithHome(t *testing.T, spmHome, registryURL, workDir string, args ...string) spmResult {
	t.Helper()

	cmd := exec.Command(binaryPath, args...)

	// Build a clean env with required overrides.
	cmd.Env = append(os.Environ(),
		"SPM_HOME="+spmHome,
		"SPM_REGISTRY="+registryURL,
		// Disable color output for easier assertion.
		"NO_COLOR=1",
		"TERM=dumb",
	)

	if workDir != "" {
		cmd.Dir = workDir
	}

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			t.Fatalf("failed to run spm binary: %v", err)
		}
	}

	return spmResult{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: exitCode,
	}
}

// startMockRegistry starts an httptest.Server that mocks registry API endpoints.
// It returns the server (caller should defer server.Close()).
func startMockRegistry(t *testing.T) *httptest.Server {
	t.Helper()

	mux := http.NewServeMux()

	// GET /api/v1/skills?q=... — search
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		resp := map[string]any{
			"results": []map[string]any{
				{
					"name":        "hello-world",
					"version":     "1.0.0",
					"description": "A hello world skill",
					"author":      map[string]string{"username": "testuser", "trust_tier": "registered"},
					"category":    "other",
					"tags":        []string{"hello"},
					"platforms":   []string{"*"},
					"downloads":   42,
					"license":     "MIT",
				},
			},
			"total":    1,
			"page":     1,
			"per_page": 20,
			"pages":    1,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	// GET /api/v1/skills/<name> — info
	mux.HandleFunc("/api/v1/skills/hello-world", func(w http.ResponseWriter, r *http.Request) {
		// Specific version sub-paths
		if r.URL.Path == "/api/v1/skills/hello-world/1.0.0/download" {
			// Return the download URL as a redirect to self
			sklURL := "http://" + r.Host + "/files/hello-world-1.0.0.skl"
			http.Redirect(w, r, sklURL, http.StatusFound)
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		resp := map[string]any{
			"name":           "hello-world",
			"description":    "A hello world skill",
			"author":         map[string]string{"username": "testuser", "trust_tier": "registered"},
			"category":       "other",
			"latest_version": "1.0.0",
			"downloads":      42,
			"versions":       []map[string]string{{"version": "1.0.0", "published_at": "2025-01-01T00:00:00Z"}},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	// POST /api/v1/resolve — resolve versions
	mux.HandleFunc("/api/v1/resolve", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// Parse request to get skill names
		var reqBody struct {
			Skills []struct {
				Name  string `json:"name"`
				Range string `json:"range"`
			} `json:"skills"`
		}
		_ = json.NewDecoder(r.Body).Decode(&reqBody)

		resolved := make([]map[string]any, 0, len(reqBody.Skills))
		for _, s := range reqBody.Skills {
			resolved = append(resolved, map[string]any{
				"name":            s.Name,
				"version":         "1.0.0",
				"checksum_sha256": "abc123",
				"download_url":    fmt.Sprintf("http://%s/files/%s-1.0.0.skl", r.Host, s.Name),
				"size_bytes":      1024,
				"trust_tier":      "registered",
				"signed":          false,
				"scan_status":     "passed",
				"dependencies":    []string{},
			})
		}

		resp := map[string]any{
			"resolved":   resolved,
			"unresolved": []any{},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	// GET /files/*.skl — serve a minimal .skl archive
	mux.HandleFunc("/files/", func(w http.ResponseWriter, r *http.Request) {
		sklData := buildMinimalSkl(t)
		w.Header().Set("Content-Type", "application/gzip")
		_, _ = w.Write(sklData)
	})

	// GET /api/v1/auth/whoami — requires token
	mux.HandleFunc("/api/v1/auth/whoami", func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") == "" {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized", "message": "Missing or invalid token"})
			return
		}
		resp := map[string]any{
			"id":               "user-123",
			"username":         "testuser",
			"github_login":     "testuser",
			"email":            "test@example.com",
			"trust_tier":       "registered",
			"role":             "user",
			"skills_published": 3,
			"total_downloads":  100,
			"created_at":       "2025-01-01T00:00:00Z",
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	server := httptest.NewServer(mux)
	return server
}

// buildMinimalSkl creates a minimal .skl archive (tar.gz) containing manifest.json and SKILL.md.
func buildMinimalSkl(t *testing.T) []byte {
	t.Helper()

	var buf bytes.Buffer
	gw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gw)

	manifest := map[string]any{
		"name":        "hello-world",
		"version":     "1.0.0",
		"description": "A hello world skill for testing",
		"categories":  []string{"other"},
		"license":     "MIT",
		"keywords":    []string{},
		"agents":      map[string]any{"platforms": []string{"*"}},
		"spm":         map[string]any{"manifest_version": 1},
	}
	manifestJSON, _ := json.MarshalIndent(manifest, "", "  ")

	skillMD := []byte("# Hello World\n\nA hello world skill.\n")

	// Add manifest.json
	addFileToTar(t, tw, "manifest.json", manifestJSON)
	// Add SKILL.md
	addFileToTar(t, tw, "SKILL.md", skillMD)

	_ = tw.Close()
	_ = gw.Close()

	return buf.Bytes()
}

// addFileToTar adds a file with given name and content to a tar writer.
func addFileToTar(t *testing.T, tw *tar.Writer, name string, content []byte) {
	t.Helper()
	hdr := &tar.Header{
		Name: name,
		Mode: 0o644,
		Size: int64(len(content)),
	}
	if err := tw.WriteHeader(hdr); err != nil {
		t.Fatalf("writing tar header for %s: %v", name, err)
	}
	if _, err := tw.Write(content); err != nil {
		t.Fatalf("writing tar content for %s: %v", name, err)
	}
}

// createSkillDir creates a minimal valid skill directory with manifest.json, SKILL.md, and tests/eval.json.
// Returns the path to the directory.
func createSkillDir(t *testing.T, name, version, description string) string {
	t.Helper()

	dir := t.TempDir()

	manifest := map[string]any{
		"name":        name,
		"version":     version,
		"description": description,
		"categories":  []string{"other"},
		"license":     "MIT",
		"keywords":    []string{},
		"agents":      map[string]any{"platforms": []string{"*"}},
		"spm":         map[string]any{"manifest_version": 1},
	}
	manifestJSON, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		t.Fatalf("marshalling manifest: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), manifestJSON, 0o644); err != nil {
		t.Fatalf("writing manifest.json: %v", err)
	}

	skillMD := fmt.Sprintf("# %s\n\n%s\n\n## Usage\n\nDescribe usage.\n", name, description)
	if err := os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(skillMD), 0o644); err != nil {
		t.Fatalf("writing SKILL.md: %v", err)
	}

	// Create tests/eval.json
	testsDir := filepath.Join(dir, "tests")
	if err := os.MkdirAll(testsDir, 0o755); err != nil {
		t.Fatalf("creating tests dir: %v", err)
	}
	evalJSON := map[string]any{
		"tests": []map[string]any{
			{
				"name":              "basic test",
				"input":             "test input",
				"expected_contains": []string{"expected"},
			},
		},
	}
	evalData, _ := json.MarshalIndent(evalJSON, "", "  ")
	if err := os.WriteFile(filepath.Join(testsDir, "eval.json"), evalData, 0o644); err != nil {
		t.Fatalf("writing eval.json: %v", err)
	}

	return dir
}
