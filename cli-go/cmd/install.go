package cmd

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/linker"
	"github.com/skillpkg/spm/internal/manifest"
	"github.com/skillpkg/spm/internal/output"
	"github.com/skillpkg/spm/internal/preflight"
	"github.com/skillpkg/spm/internal/resolver"
	"github.com/skillpkg/spm/internal/skillsjson"
	"github.com/spf13/cobra"
)

var (
	installFlagAgents string
	installFlagNoLink bool
)

var installCmd = &cobra.Command{
	Use:     "install [name[@version]...]",
	Aliases: []string{"i", "add"},
	Short:   "Install one or more skills",
	Long: `Install skills by name with optional version specifiers.

If no arguments are given, installs all skills listed in skills.json.

Examples:
  spm install my-skill
  spm install my-skill@1.0.0
  spm install skill-a skill-b@^2.0.0
  spm install --agents "Claude Code,Cursor"`,
	RunE: runInstall,
}

func init() {
	installCmd.Flags().StringVar(&installFlagAgents, "agents", "", "Comma-separated list of agents to link to")
	installCmd.Flags().BoolVar(&installFlagNoLink, "no-link", false, "Skip linking to agent directories")
	rootCmd.AddCommand(installCmd)
}

// installResult holds the result of installing a single skill.
type installResult struct {
	Name         string   `json:"name"`
	Version      string   `json:"version"`
	LinkedAgents []string `json:"linked_agents,omitempty"`
	MissingDeps  []string `json:"missing_dependencies,omitempty"`
	Skipped      bool     `json:"skipped,omitempty"`
	SkipReason   string   `json:"skip_reason,omitempty"`
}

// installJSONOutput is the JSON mode output for the install command.
type installJSONOutput struct {
	Command string          `json:"command"`
	Status  string          `json:"status"`
	Skills  []installResult `json:"skills"`
}

func runInstall(cmd *cobra.Command, args []string) error {
	spmHome, err := config.HomeDir()
	if err != nil {
		return fmt.Errorf("determining SPM home: %w", err)
	}

	// Ensure SPM directories exist
	for _, sub := range []string{"skills", "cache"} {
		if err := os.MkdirAll(filepath.Join(spmHome, sub), 0o755); err != nil {
			return fmt.Errorf("creating %s directory: %w", sub, err)
		}
	}

	// Run preflight checks
	homeDir := filepath.Dir(spmHome)
	agentDirs := preflight.DefaultAgentDirs(homeDir)
	_, _ = preflight.Scan(agentDirs, true)

	if len(args) == 0 {
		return installFromSkillsJSON(cmd, spmHome)
	}
	return installNamed(cmd, args, spmHome)
}

func installFromSkillsJSON(cmd *cobra.Command, spmHome string) error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	sj, err := skillsjson.LoadSkillsJson(cwd)
	if err != nil {
		return fmt.Errorf("loading skills.json: %w", err)
	}
	if sj == nil || len(sj.Skills) == 0 {
		Out.Log("%s No skills.json found or no dependencies declared.", output.Icons["info"])
		Out.Log("  Run %s to install a skill.", output.Cyan("spm install <skill-name>"))
		return nil
	}

	Out.Log("Reading skills.json... %d skill(s) declared", len(sj.Skills))

	// Build resolve requests from skills.json entries
	resolveSkills := make([]api.ResolveSkill, 0, len(sj.Skills))
	for name, vrange := range sj.Skills {
		resolveSkills = append(resolveSkills, api.ResolveSkill{Name: name, Range: vrange})
	}

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner("Resolving versions...")
	resolveResp, err := client.Resolve(resolveSkills, runtime.GOOS)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("resolving skills: %w", err)
	}

	for _, u := range resolveResp.Unresolved {
		Out.LogError("Could not resolve: %s - %s", u.Name, u.Error)
	}

	if len(resolveResp.Resolved) == 0 {
		Out.LogError("No skills could be resolved.")
		return fmt.Errorf("no skills resolved")
	}

	results := make([]installResult, 0, len(resolveResp.Resolved))
	for _, skill := range resolveResp.Resolved {
		res, err := downloadExtractLink(client, skill, spmHome, false)
		if err != nil {
			Out.LogError("Failed to install %s: %s", skill.Name, err)
			continue
		}
		results = append(results, res)
	}

	// Update lock file
	lockResolved := make([]skillsjson.ResolvedSkill, 0, len(resolveResp.Resolved))
	for _, s := range resolveResp.Resolved {
		lockResolved = append(lockResolved, skillsjson.ResolvedSkill{
			Name:        s.Name,
			Version:     s.Version,
			DownloadURL: s.DownloadURL,
			Checksum:    s.ChecksumSHA256,
		})
	}
	if err := skillsjson.UpdateLockFile(cwd, lockResolved); err != nil {
		Out.LogVerbose("Failed to update lock file: %s", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(installJSONOutput{
			Command: "install",
			Status:  "success",
			Skills:  results,
		})
	}

	Out.Log("")
	Out.Log("%s %d skill(s) installed", output.Icons["success"], len(results))
	return nil
}

func installNamed(cmd *cobra.Command, args []string, spmHome string) error {
	// Parse specifiers
	specifiers := make([]*resolver.Specifier, 0, len(args))
	for _, arg := range args {
		spec, err := resolver.Parse(arg)
		if err != nil {
			return fmt.Errorf("invalid specifier %q: %w", arg, err)
		}
		specifiers = append(specifiers, spec)
	}

	// Build resolve requests
	resolveSkills := make([]api.ResolveSkill, 0, len(specifiers))
	for _, spec := range specifiers {
		vrange := spec.VersionRange
		if vrange == "" {
			vrange = "latest"
		}
		resolveSkills = append(resolveSkills, api.ResolveSkill{
			Name:  spec.FullName(),
			Range: vrange,
		})
	}

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	sp := Out.StartSpinner("Resolving...")
	resolveResp, err := client.Resolve(resolveSkills, runtime.GOOS)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("resolving skills: %w", err)
	}

	// Report unresolved
	for _, u := range resolveResp.Unresolved {
		Out.LogError("Skill not found: %s - %s", u.Name, u.Error)
		if u.Suggestion != "" {
			Out.Log("  Did you mean: %s?", output.Cyan("spm install "+u.Suggestion))
		}
	}

	if len(resolveResp.Resolved) == 0 {
		if len(resolveResp.Unresolved) > 0 {
			return fmt.Errorf("no skills could be resolved")
		}
		return nil
	}

	// Check if already installed (from lock file)
	cwd, _ := os.Getwd()
	lock, _ := skillsjson.LoadLockFile(cwd)

	results := make([]installResult, 0, len(resolveResp.Resolved))
	lockUpdates := make([]skillsjson.ResolvedSkill, 0, len(resolveResp.Resolved))

	for _, skill := range resolveResp.Resolved {
		// Check if already installed at same version
		if lock != nil {
			if entry, ok := lock.Skills[skill.Name]; ok && entry.Version == skill.Version {
				res := installResult{
					Name:       skill.Name,
					Version:    skill.Version,
					Skipped:    true,
					SkipReason: "already installed",
				}
				results = append(results, res)
				Out.Log("%s %s@%s already installed, skipping",
					output.Icons["info"],
					output.Cyan(skill.Name),
					output.Green(skill.Version))
				continue
			}
		}

		res, err := downloadExtractLink(client, skill, spmHome, true)
		if err != nil {
			Out.LogError("Failed to install %s: %s", skill.Name, err)
			continue
		}
		results = append(results, res)

		// Find original specifier range for skills.json
		vrange := "^" + skill.Version
		for _, spec := range specifiers {
			if spec.FullName() == skill.Name && spec.VersionRange != "" && spec.VersionRange != "latest" {
				vrange = spec.VersionRange
				break
			}
		}

		// Update skills.json
		if err := skillsjson.AddSkill(cwd, skill.Name, vrange); err != nil {
			Out.LogVerbose("Failed to update skills.json: %s", err)
		}

		lockUpdates = append(lockUpdates, skillsjson.ResolvedSkill{
			Name:        skill.Name,
			Version:     skill.Version,
			DownloadURL: skill.DownloadURL,
			Checksum:    skill.ChecksumSHA256,
		})
	}

	// Update lock file
	if len(lockUpdates) > 0 {
		if err := skillsjson.UpdateLockFile(cwd, lockUpdates); err != nil {
			Out.LogVerbose("Failed to update lock file: %s", err)
		}
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(installJSONOutput{
			Command: "install",
			Status:  "success",
			Skills:  results,
		})
	}

	Out.Log("")
	for _, r := range results {
		if r.Skipped {
			continue
		}
		Out.Log("%s %s@%s installed", output.Icons["success"],
			output.Cyan(r.Name), output.Green(r.Version))
		if len(r.LinkedAgents) > 0 {
			Out.Log("  Linked to: %s", strings.Join(r.LinkedAgents, ", "))
		}
		if len(r.MissingDeps) > 0 {
			Out.Log("  %s Missing dependencies: %s", output.Icons["warning"],
				strings.Join(r.MissingDeps, ", "))
		}
	}

	return nil
}

// downloadExtractLink downloads a skill, extracts it, optionally links it, and checks dependencies.
func downloadExtractLink(client *api.Client, skill api.ResolvedSkill, spmHome string, showSpinner bool) (installResult, error) {
	res := installResult{
		Name:    skill.Name,
		Version: skill.Version,
	}

	// Download
	var sp interface{ Stop() }
	if showSpinner {
		s := Out.StartSpinner(fmt.Sprintf("Downloading %s@%s...", skill.Name, skill.Version))
		if s != nil {
			sp = s
		}
	}

	sklData, err := downloadSkl(client, skill.Name, skill.Version)
	if sp != nil {
		sp.Stop()
	}
	if err != nil {
		return res, fmt.Errorf("downloading: %w", err)
	}

	// Extract to ~/.spm/skills/<name>/<version>/
	skillDir := filepath.Join(spmHome, "skills", skill.Name, skill.Version)
	if err := os.MkdirAll(skillDir, 0o755); err != nil {
		return res, fmt.Errorf("creating skill directory: %w", err)
	}

	if err := extractTarGz(sklData, skillDir); err != nil {
		return res, fmt.Errorf("extracting: %w", err)
	}

	// Check for dependency warnings from manifest
	res.MissingDeps = checkDependencies(skillDir)

	// Link to agent directories
	if !installFlagNoLink {
		homeDir := filepath.Dir(spmHome)
		var agentDirs []linker.AgentDir

		if installFlagAgents != "" {
			// Filter to only requested agents
			allDirs := linker.DefaultAgentDirs(homeDir)
			requested := strings.Split(installFlagAgents, ",")
			for _, ad := range allDirs {
				for _, r := range requested {
					if strings.EqualFold(strings.TrimSpace(r), ad.Name) {
						agentDirs = append(agentDirs, ad)
					}
				}
			}
		} else {
			agentDirs = linker.DefaultAgentDirs(homeDir)
		}

		lnk := linker.New(agentDirs)
		linkResult, err := lnk.LinkSkill(skillDir, skill.Name)
		if err != nil {
			Out.LogVerbose("Failed to link %s: %s", skill.Name, err)
		} else if linkResult != nil {
			res.LinkedAgents = linkResult.Agents
		}
	}

	return res, nil
}

// downloadSkl downloads the .skl file for a skill version.
func downloadSkl(client *api.Client, name, version string) ([]byte, error) {
	dlURL, err := client.DownloadURL(name, version)
	if err != nil {
		return nil, err
	}

	resp, err := http.Get(dlURL) //nolint:gosec
	if err != nil {
		return nil, fmt.Errorf("downloading from %s: %w", dlURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("download returned HTTP %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// extractTarGz extracts a tar.gz archive into the target directory.
func extractTarGz(data []byte, targetDir string) error {
	gr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("opening gzip: %w", err)
	}
	defer gr.Close()

	return extractTar(gr, targetDir)
}

func extractTar(r io.Reader, targetDir string) error {
	tr := tar.NewReader(r)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("reading tar: %w", err)
		}

		// Sanitize path to prevent directory traversal
		cleanName := filepath.Clean(header.Name)
		if strings.HasPrefix(cleanName, "..") {
			continue
		}
		target := filepath.Join(targetDir, cleanName)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0o755); err != nil {
				return fmt.Errorf("creating directory %s: %w", target, err)
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
				return fmt.Errorf("creating parent dir for %s: %w", target, err)
			}
			f, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return fmt.Errorf("creating file %s: %w", target, err)
			}
			if _, err := io.Copy(f, tr); err != nil {
				f.Close()
				return fmt.Errorf("writing file %s: %w", target, err)
			}
			f.Close()
		}
	}
	return nil
}

// checkDependencies reads the manifest and checks for missing system tools.
func checkDependencies(skillDir string) []string {
	manifestPath := filepath.Join(skillDir, "skill.json")
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil
	}

	var m manifest.Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil
	}

	if m.Dependencies == nil {
		return nil
	}

	var missing []string

	// Check pip dependencies
	if len(m.Dependencies.Pip) > 0 {
		if _, err := exec.LookPath("pip"); err != nil {
			if _, err := exec.LookPath("pip3"); err != nil {
				missing = append(missing, "pip (for: "+strings.Join(m.Dependencies.Pip, ", ")+")")
			}
		}
	}

	// Check npm dependencies
	if len(m.Dependencies.Npm) > 0 {
		if _, err := exec.LookPath("npm"); err != nil {
			missing = append(missing, "npm (for: "+strings.Join(m.Dependencies.Npm, ", ")+")")
		}
	}

	// Check system dependencies
	for _, dep := range m.Dependencies.System {
		if _, err := exec.LookPath(dep); err != nil {
			missing = append(missing, dep)
		}
	}

	return missing
}
