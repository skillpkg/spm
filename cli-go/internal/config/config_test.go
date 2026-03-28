package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadReturnsDefaultsWhenNoFile(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)
	t.Setenv("SPM_REGISTRY", "")
	t.Setenv("SPM_TOKEN", "")

	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "", cfg.Registry)
	assert.Equal(t, "", cfg.Token)
}

func TestSaveAndLoad(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)
	t.Setenv("SPM_REGISTRY", "")
	t.Setenv("SPM_TOKEN", "")

	original := &Config{
		Registry: "https://custom.registry.dev",
		Token:    "ghp_abc123",
	}
	err := Save(original)
	require.NoError(t, err)

	loaded, err := Load()
	require.NoError(t, err)
	assert.Equal(t, original.Registry, loaded.Registry)
	assert.Equal(t, original.Token, loaded.Token)
}

func TestSaveCreatesDirectory(t *testing.T) {
	tmp := t.TempDir()
	nested := filepath.Join(tmp, "deep", "nested")
	t.Setenv("SPM_HOME", nested)

	err := Save(&Config{Token: "test"})
	require.NoError(t, err)

	_, err = os.Stat(filepath.Join(nested, configFileName))
	assert.NoError(t, err)
}

func TestConfigFilePermissions(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)

	err := Save(&Config{Token: "secret"})
	require.NoError(t, err)

	info, err := os.Stat(filepath.Join(tmp, configFileName))
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o600), info.Mode().Perm())
}

func TestTokenPersistence(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)
	t.Setenv("SPM_REGISTRY", "")
	t.Setenv("SPM_TOKEN", "")

	// Save with token
	err := Save(&Config{Token: "my-jwt-token"})
	require.NoError(t, err)

	// Load it back
	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "my-jwt-token", cfg.Token)

	// Clear token
	cfg.Token = ""
	err = Save(cfg)
	require.NoError(t, err)

	cfg2, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "", cfg2.Token)
}

func TestRegistryURLDefault(t *testing.T) {
	cfg := &Config{}
	assert.Equal(t, DefaultRegistry, cfg.RegistryURL())
}

func TestRegistryURLFromConfig(t *testing.T) {
	cfg := &Config{Registry: "https://my-registry.com"}
	assert.Equal(t, "https://my-registry.com", cfg.RegistryURL())
}

func TestEnvVarOverrideSPM_HOME(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)

	dir, err := HomeDir()
	require.NoError(t, err)
	assert.Equal(t, tmp, dir)
}

func TestEnvVarOverrideSPM_REGISTRY(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)
	t.Setenv("SPM_TOKEN", "")

	// Save a config with one registry
	err := Save(&Config{Registry: "https://file-registry.com"})
	require.NoError(t, err)

	// Env var should override
	t.Setenv("SPM_REGISTRY", "https://env-registry.com")
	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "https://env-registry.com", cfg.Registry)
}

func TestEnvVarOverrideSPM_TOKEN(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("SPM_HOME", tmp)
	t.Setenv("SPM_REGISTRY", "")

	// Save a config with one token
	err := Save(&Config{Token: "file-token"})
	require.NoError(t, err)

	// Env var should override
	t.Setenv("SPM_TOKEN", "env-token")
	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "env-token", cfg.Token)
}
