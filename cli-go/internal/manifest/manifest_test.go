package manifest

import (
	"encoding/json"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func testdataDir() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "testdata", "manifests")
}

func TestLoadValidMinimal(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "valid-minimal.json"))
	require.NoError(t, err)
	assert.Equal(t, "hello-world", m.Name)
	assert.Equal(t, "1.0.0", m.Version)
	assert.Contains(t, m.Description, "minimal skill")
}

func TestLoadValidFull(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "valid-full.json"))
	require.NoError(t, err)
	assert.Equal(t, "@myorg/data-pipeline", m.Name)
	assert.Equal(t, "2.3.1-beta.1", m.Version)
	assert.Len(t, m.Authors, 1)
	assert.Equal(t, "Alice Smith", m.Authors[0].Name)
	assert.Equal(t, []string{"data-analysis", "backend"}, m.Categories)
	assert.Equal(t, "MIT", m.License)
	assert.NotNil(t, m.URLs)
	assert.Equal(t, "https://example.com", m.URLs.Homepage)
	assert.NotNil(t, m.Agents)
	assert.Equal(t, "large", m.Agents.MinContext)
	assert.True(t, m.Agents.RequiresNetwork)
	assert.NotNil(t, m.Dependencies)
	assert.Equal(t, "^1.0.0", m.Dependencies.Skills["csv-reader"])
	assert.Contains(t, m.Dependencies.Pip, "pandas>=2.0")
	assert.NotNil(t, m.Security)
	assert.False(t, m.Security.Sandboxed)
	assert.NotNil(t, m.Files)
	assert.Contains(t, m.Files.Include, "SKILL.md")
	assert.Equal(t, 1, m.SPM.ManifestVersion)
}

func TestLoadFileNotFound(t *testing.T) {
	_, err := LoadFile("/nonexistent/manifest.json")
	assert.Error(t, err)
}

func TestParseInvalidJSON(t *testing.T) {
	_, err := Parse([]byte(`{invalid json`))
	assert.Error(t, err)
}

func TestRoundTripJSON(t *testing.T) {
	original := &Manifest{
		Name:        "test-skill",
		Version:     "1.0.0",
		Description: "A test skill that does something useful and interesting",
		Categories:  []string{"testing"},
		Keywords:    []string{"test", "example"},
	}

	data, err := original.ToJSON()
	require.NoError(t, err)

	parsed, err := Parse(data)
	require.NoError(t, err)

	assert.Equal(t, original.Name, parsed.Name)
	assert.Equal(t, original.Version, parsed.Version)
	assert.Equal(t, original.Description, parsed.Description)
	assert.Equal(t, original.Categories, parsed.Categories)
	assert.Equal(t, original.Keywords, parsed.Keywords)
}

func TestParsePreservesAllFields(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "valid-full.json"))
	require.NoError(t, err)

	data, err := m.ToJSON()
	require.NoError(t, err)

	// Ensure it's valid JSON
	var raw map[string]any
	err = json.Unmarshal(data, &raw)
	require.NoError(t, err)

	// Key fields preserved
	assert.Equal(t, "@myorg/data-pipeline", raw["name"])
	assert.Equal(t, "2.3.1-beta.1", raw["version"])
}

func TestCategoriesListComplete(t *testing.T) {
	expected := []string{
		"documents", "data-viz", "data-analysis", "ai-ml",
		"frontend", "backend", "infra", "testing",
		"code-quality", "security", "productivity", "other",
	}
	assert.Equal(t, expected, Categories)
}

func TestIsValidCategory(t *testing.T) {
	for _, cat := range Categories {
		assert.True(t, IsValidCategory(cat), "should be valid: %s", cat)
	}
	assert.False(t, IsValidCategory("not-a-category"))
	assert.False(t, IsValidCategory(""))
}
