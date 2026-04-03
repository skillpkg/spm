package config

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/BurntSushi/toml"
)

const (
	// DefaultRegistry is the default SPM registry URL.
	DefaultRegistry = "https://registry.skillpkg.dev"

	configFileName = "config.toml"
	dirName        = ".spm"
)

// Config represents the SPM configuration stored in ~/.spm/config.toml.
type Config struct {
	Registry string `toml:"registry,omitempty"`
	Token    string `toml:"token,omitempty"`
}

// HomeDir returns the SPM home directory, respecting SPM_HOME env var.
func HomeDir() (string, error) {
	if env := os.Getenv("SPM_HOME"); env != "" {
		return env, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, dirName), nil
}

// Load reads the config from ~/.spm/config.toml.
// If the file does not exist, it returns a zero-value Config (no error).
// Environment variables SPM_REGISTRY and SPM_TOKEN override file values.
func Load() (*Config, error) {
	cfg := &Config{}

	homeDir, err := HomeDir()
	if err != nil {
		return nil, err
	}

	configPath := filepath.Join(homeDir, configFileName)
	if _, err := os.Stat(configPath); err == nil {
		if _, err := toml.DecodeFile(configPath, cfg); err != nil {
			return nil, err
		}
	}

	// Env var overrides
	if env := os.Getenv("SPM_REGISTRY"); env != "" {
		cfg.Registry = env
	}
	if env := os.Getenv("SPM_TOKEN"); env != "" {
		cfg.Token = env
	}

	return cfg, nil
}

// Save writes the config to ~/.spm/config.toml, creating the directory if needed.
func Save(cfg *Config) error {
	homeDir, err := HomeDir()
	if err != nil {
		return err
	}

	if err := os.MkdirAll(homeDir, 0o700); err != nil {
		return err
	}

	configPath := filepath.Join(homeDir, configFileName)
	f, err := os.OpenFile(configPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()

	return toml.NewEncoder(f).Encode(cfg)
}

// RegistryURL returns the effective registry URL.
// Priority: SPM_REGISTRY env > config file > default.
// Strips trailing /api/v1 if present since the client appends it.
func (c *Config) RegistryURL() string {
	url := DefaultRegistry
	if c.Registry != "" {
		url = c.Registry
	}
	url = strings.TrimRight(url, "/")
	url = strings.TrimSuffix(url, "/api/v1")
	return url
}
