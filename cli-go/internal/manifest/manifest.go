package manifest

import (
	"encoding/json"
	"os"
)

// Categories is the complete list of valid skill categories.
var Categories = []string{
	"documents",
	"data-viz",
	"data-analysis",
	"ai-ml",
	"frontend",
	"backend",
	"infra",
	"testing",
	"code-quality",
	"security",
	"productivity",
	"other",
}

// categorySet is a fast lookup set for validation.
var categorySet map[string]bool

func init() {
	categorySet = make(map[string]bool, len(Categories))
	for _, c := range Categories {
		categorySet[c] = true
	}
}

// IsValidCategory returns true if the given string is a valid category.
func IsValidCategory(s string) bool {
	return categorySet[s]
}

// Person represents an author or maintainer.
type Person struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
	URL   string `json:"url,omitempty"`
}

// URLs contains links related to the skill.
type URLs struct {
	Homepage      string `json:"homepage,omitempty"`
	Repository    string `json:"repository,omitempty"`
	Issues        string `json:"issues,omitempty"`
	Documentation string `json:"documentation,omitempty"`
	Changelog     string `json:"changelog,omitempty"`
	Funding       string `json:"funding,omitempty"`
}

// Agents describes platform requirements.
type Agents struct {
	Platforms       []string `json:"platforms,omitempty"`
	RequiresTools   []string `json:"requires_tools,omitempty"`
	MinContext      string   `json:"min_context,omitempty"`
	RequiresNetwork bool     `json:"requires_network,omitempty"`
	RequiresMCP     []string `json:"requires_mcp,omitempty"`
}

// Dependencies describes external dependencies.
type Dependencies struct {
	Skills map[string]string `json:"skills,omitempty"`
	Pip    []string          `json:"pip,omitempty"`
	Npm    []string          `json:"npm,omitempty"`
	System []string          `json:"system,omitempty"`
}

// Security describes security constraints.
type Security struct {
	Sandboxed       bool     `json:"sandboxed,omitempty"`
	NetworkAccess   bool     `json:"network_access,omitempty"`
	FilesystemScope []string `json:"filesystem_scope,omitempty"`
}

// Files describes include/exclude patterns.
type Files struct {
	Include []string `json:"include,omitempty"`
	Exclude []string `json:"exclude,omitempty"`
}

// SPMMetadata contains SPM-specific metadata.
type SPMMetadata struct {
	ManifestVersion int `json:"manifest_version,omitempty"`
}

// Manifest represents a skill package manifest (skill.json).
type Manifest struct {
	// Required
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`

	// People
	Authors     []Person `json:"authors,omitempty"`
	Maintainers []Person `json:"maintainers,omitempty"`

	// Discovery
	Keywords   []string `json:"keywords,omitempty"`
	Categories []string `json:"categories,omitempty"`

	// Legal
	License string `json:"license,omitempty"`
	Private bool   `json:"private,omitempty"`

	// Links
	URLs *URLs `json:"urls,omitempty"`

	// Provenance
	ForkedFrom string `json:"forked_from,omitempty"`

	// Platform
	Agents *Agents `json:"agents,omitempty"`

	// Dependencies
	Dependencies *Dependencies `json:"dependencies,omitempty"`

	// Security
	Security *Security `json:"security,omitempty"`

	// Files
	Files *Files `json:"files,omitempty"`

	// SPM metadata
	Schema string       `json:"$schema,omitempty"`
	SPM    *SPMMetadata `json:"spm,omitempty"`
}

// LoadFile reads and parses a manifest from a JSON file.
func LoadFile(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	return Parse(data)
}

// Parse parses a manifest from JSON bytes.
func Parse(data []byte) (*Manifest, error) {
	var m Manifest
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

// ToJSON serializes the manifest to indented JSON.
func (m *Manifest) ToJSON() ([]byte, error) {
	return json.MarshalIndent(m, "", "  ")
}
