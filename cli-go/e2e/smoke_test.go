package e2e

import (
	"strings"
	"testing"
)

func TestSmokeHelp(t *testing.T) {
	res := spm(t, "", "", "--help")

	if res.ExitCode != 0 {
		t.Fatalf("expected exit code 0, got %d\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Should list known commands
	expectedCommands := []string{
		"search", "install", "info", "list", "agents",
		"init", "test", "pack", "version", "publish",
		"login", "logout", "whoami",
	}
	for _, cmd := range expectedCommands {
		if !strings.Contains(res.Stdout, cmd) {
			t.Errorf("--help output missing command %q", cmd)
		}
	}
}

func TestSmokeVersion(t *testing.T) {
	res := spm(t, "", "", "--version")

	if res.ExitCode != 0 {
		t.Fatalf("expected exit code 0, got %d\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// Should contain the version string we compiled with
	if !strings.Contains(res.Stdout, "0.0.1-test") {
		t.Errorf("--version output does not contain expected version string\nstdout: %s", res.Stdout)
	}
}

func TestSmokeWhoamiNoToken(t *testing.T) {
	res := spm(t, "", "", "whoami")

	if res.ExitCode == 0 {
		t.Fatal("expected non-zero exit code for whoami without token")
	}

	combined := res.Stdout + res.Stderr
	if !strings.Contains(strings.ToLower(combined), "not logged in") {
		t.Errorf("expected 'not logged in' message, got:\nstdout: %s\nstderr: %s", res.Stdout, res.Stderr)
	}
}

func TestSmokeSearchNoArgs(t *testing.T) {
	res := spm(t, "", "", "search")

	if res.ExitCode == 0 {
		t.Fatal("expected non-zero exit code for search without args")
	}
}

func TestSmokeAgents(t *testing.T) {
	res := spm(t, "", "", "agents")

	// agents should always succeed even if no agents are found
	if res.ExitCode != 0 {
		t.Fatalf("expected exit code 0, got %d\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}
}

func TestSmokeUnknownCommand(t *testing.T) {
	res := spm(t, "", "", "nonexistent-command-xyz")

	if res.ExitCode == 0 {
		t.Fatal("expected non-zero exit code for unknown command")
	}

	combined := res.Stdout + res.Stderr
	if !strings.Contains(strings.ToLower(combined), "unknown") {
		t.Errorf("expected 'unknown' in error output, got:\nstdout: %s\nstderr: %s", res.Stdout, res.Stderr)
	}
}

func TestSmokeSearchWithMockRegistry(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	res := spm(t, server.URL, "", "search", "hello")

	if res.ExitCode != 0 {
		t.Fatalf("expected exit code 0, got %d\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	if !strings.Contains(res.Stdout, "hello-world") {
		t.Errorf("search output should contain 'hello-world'\nstdout: %s", res.Stdout)
	}
}

func TestSmokeSearchJSON(t *testing.T) {
	server := startMockRegistry(t)
	defer server.Close()

	res := spm(t, server.URL, "", "--json", "search", "hello")

	if res.ExitCode != 0 {
		t.Fatalf("expected exit code 0, got %d\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	// JSON output should be valid JSON containing results
	if !strings.Contains(res.Stdout, `"results"`) {
		t.Errorf("--json search output should contain 'results' key\nstdout: %s", res.Stdout)
	}
	if !strings.Contains(res.Stdout, "hello-world") {
		t.Errorf("--json search output should contain 'hello-world'\nstdout: %s", res.Stdout)
	}
}

func TestSmokeHelpSubcommand(t *testing.T) {
	res := spm(t, "", "", "help", "install")

	if res.ExitCode != 0 {
		t.Fatalf("expected exit code 0, got %d\nstdout: %s\nstderr: %s", res.ExitCode, res.Stdout, res.Stderr)
	}

	if !strings.Contains(res.Stdout, "install") {
		t.Errorf("help install output should contain 'install'\nstdout: %s", res.Stdout)
	}
}
