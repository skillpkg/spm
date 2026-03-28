package cmd

import (
	"os"

	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

// Version is set at build time via ldflags.
var Version = "dev"

// Out is the global output manager.
var Out = output.New()

// Cfg is the global config, loaded at startup.
var Cfg *config.Config

var (
	flagJSON     bool
	flagVerbose  bool
	flagSilent   bool
	flagRegistry string
)

var rootCmd = &cobra.Command{
	Use:   "spm",
	Short: "Skills Package Manager — install and manage AI agent skills",
	Long: `SPM is a package manager for AI agent skills.

Discover, install, publish, and manage skills for Claude, Cursor, Codex, and other AI agents.

Documentation: https://skillpkg.dev`,
	Version: Version,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		// Set output mode based on flags (priority: json > silent > verbose)
		if flagJSON {
			Out.Mode = output.ModeJSON
		} else if flagSilent {
			Out.Mode = output.ModeSilent
		} else if flagVerbose {
			Out.Mode = output.ModeVerbose
		}

		// Load config
		cfg, err := config.Load()
		if err != nil {
			Out.LogError("failed to load config: %s", err)
			return err
		}
		Cfg = cfg

		// Override registry from flag
		if flagRegistry != "" {
			Cfg.Registry = flagRegistry
		}

		return nil
	},
	SilenceUsage:  true,
	SilenceErrors: true,
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		Out.LogError("%s", err)
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&flagJSON, "json", false, "Output as JSON")
	rootCmd.PersistentFlags().BoolVar(&flagVerbose, "verbose", false, "Show verbose output")
	rootCmd.PersistentFlags().BoolVar(&flagSilent, "silent", false, "Suppress all non-error output")
	rootCmd.PersistentFlags().StringVar(&flagRegistry, "registry", "", "Override registry URL")
}
