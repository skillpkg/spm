package cmd

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/skillpkg/spm/internal/manifest"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var packCmd = &cobra.Command{
	Use:   "pack [path]",
	Short: "Create a .skl archive from the current skill",
	Long:  "Pack a skill directory into a .skl file (tar.gz archive) containing manifest.json, SKILL.md, and declared files.",
	Args:  cobra.MaximumNArgs(1),
	RunE:  runPack,
}

func init() {
	rootCmd.AddCommand(packCmd)
}

func runPack(_ *cobra.Command, args []string) error {
	dir, err := resolveSkillDir(args)
	if err != nil {
		return err
	}

	// Read and validate manifest
	manifestPath := filepath.Join(dir, "manifest.json")
	m, err := manifest.LoadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("could not load manifest.json: %w", err)
	}
	if err := manifest.Validate(m); err != nil {
		return fmt.Errorf("manifest validation failed: %w", err)
	}

	// Collect files to pack
	files, err := collectPackFiles(dir, m)
	if err != nil {
		return fmt.Errorf("collecting files: %w", err)
	}
	if len(files) == 0 {
		return fmt.Errorf("no files to pack")
	}

	// Build archive name
	archiveName := fmt.Sprintf("%s-%s.skl", strings.ReplaceAll(m.Name, "/", "-"), m.Version)
	archivePath := filepath.Join(dir, archiveName)

	// Create tar.gz
	sp := Out.StartSpinner(fmt.Sprintf("Packing %s@%s...", m.Name, m.Version))
	err = createTarGz(archivePath, dir, files)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("creating archive: %w", err)
	}

	// Get size
	stat, err := os.Stat(archivePath)
	if err != nil {
		return fmt.Errorf("reading archive size: %w", err)
	}

	// JSON mode
	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"name":    m.Name,
			"version": m.Version,
			"archive": archiveName,
			"path":    archivePath,
			"files":   files,
			"size":    stat.Size(),
		})
	}

	// Human mode
	Out.Log("")
	Out.Log("  %s Packed %s (%d file%s, %s)",
		output.Icons["success"],
		output.Cyan(fmt.Sprintf("%s@%s", m.Name, m.Version)),
		len(files), pluralS(len(files)),
		formatBytes(stat.Size()),
	)
	Out.Log("")
	for _, f := range files {
		Out.Log("  %s", output.Dim(f))
	}
	Out.Log("")
	Out.Log("  %s %s", output.Dim("Archive:"), output.Cyan(archiveName))
	Out.Log("  %s %s", output.Dim("Publish:"), output.Cyan("spm publish"))
	Out.Log("")

	return nil
}

func collectPackFiles(dir string, m *manifest.Manifest) ([]string, error) {
	var files []string

	// Always include manifest.json
	files = append(files, "manifest.json")

	// Include SKILL.md if it exists
	if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); err == nil {
		files = append(files, "SKILL.md")
	}

	// Include scripts/ directory
	scriptsDir := filepath.Join(dir, "scripts")
	if info, err := os.Stat(scriptsDir); err == nil && info.IsDir() {
		err := filepath.Walk(scriptsDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() {
				rel, err := filepath.Rel(dir, path)
				if err != nil {
					return err
				}
				files = append(files, rel)
			}
			return nil
		})
		if err != nil {
			return nil, fmt.Errorf("walking scripts: %w", err)
		}
	}

	// Include files from manifest.files.include
	if m.Files != nil {
		for _, pattern := range m.Files.Include {
			fullPath := filepath.Join(dir, pattern)
			if _, err := os.Stat(fullPath); err == nil {
				found := false
				for _, f := range files {
					if f == pattern {
						found = true
						break
					}
				}
				if !found {
					files = append(files, pattern)
				}
			}
		}
	}

	return files, nil
}

func createTarGz(archivePath, baseDir string, files []string) error {
	outFile, err := os.Create(archivePath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	gzWriter := gzip.NewWriter(outFile)
	defer gzWriter.Close()

	tw := tar.NewWriter(gzWriter)
	defer tw.Close()

	for _, file := range files {
		fullPath := filepath.Join(baseDir, file)
		info, err := os.Stat(fullPath)
		if err != nil {
			return fmt.Errorf("stat %s: %w", file, err)
		}

		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return fmt.Errorf("header %s: %w", file, err)
		}
		header.Name = file

		if err := tw.WriteHeader(header); err != nil {
			return fmt.Errorf("write header %s: %w", file, err)
		}

		f, err := os.Open(fullPath)
		if err != nil {
			return fmt.Errorf("open %s: %w", file, err)
		}
		if _, err := io.Copy(tw, f); err != nil {
			f.Close()
			return fmt.Errorf("copy %s: %w", file, err)
		}
		f.Close()
	}

	return nil
}

func formatBytes(b int64) string {
	if b < 1024 {
		return fmt.Sprintf("%d B", b)
	}
	kb := float64(b) / 1024
	if kb < 1024 {
		return fmt.Sprintf("%.1f KB", kb)
	}
	mb := kb / 1024
	return fmt.Sprintf("%.1f MB", mb)
}
