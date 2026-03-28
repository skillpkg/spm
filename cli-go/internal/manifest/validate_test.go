package manifest

import (
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateValidMinimal(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "valid-minimal.json"))
	require.NoError(t, err)
	assert.NoError(t, Validate(m))
}

func TestValidateValidFull(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "valid-full.json"))
	require.NoError(t, err)
	assert.NoError(t, Validate(m))
}

func TestValidateInvalidName(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "invalid-name.json"))
	require.NoError(t, err)
	err = Validate(m)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "name")
}

func TestValidateInvalidVersion(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "invalid-version.json"))
	require.NoError(t, err)
	err = Validate(m)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "version")
}

func TestValidateInvalidDescription(t *testing.T) {
	m, err := LoadFile(filepath.Join(testdataDir(), "invalid-description.json"))
	require.NoError(t, err)
	err = Validate(m)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "description")
}

func TestValidateNameConstraints(t *testing.T) {
	tests := []struct {
		name  string
		valid bool
		desc  string
	}{
		{"a", false, "too short"},
		{"ab", true, "minimum length"},
		{"hello-world", true, "simple kebab-case"},
		{"my-skill-123", true, "with numbers"},
		{"@org/my-skill", true, "scoped name"},
		{"@my-org/skill", true, "scoped with hyphen in org"},
		{"Hello", false, "uppercase"},
		{"hello world", false, "spaces"},
		{"hello_world", false, "underscores"},
		{"-hello", false, "starts with hyphen"},
		{"1hello", false, "starts with number"},
		{"@/skill", false, "empty scope"},
		{strings.Repeat("a", 65), false, "too long"},
		{strings.Repeat("a", 64), true, "max length"},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			err := ValidateName(tt.name)
			if tt.valid {
				assert.NoError(t, err, "expected %q to be valid", tt.name)
			} else {
				assert.Error(t, err, "expected %q to be invalid", tt.name)
			}
		})
	}
}

func TestValidateVersionConstraints(t *testing.T) {
	tests := []struct {
		version string
		valid   bool
		desc    string
	}{
		{"1.0.0", true, "simple semver"},
		{"0.0.1", true, "zero major"},
		{"10.20.30", true, "multi-digit"},
		{"1.0.0-alpha", true, "prerelease"},
		{"1.0.0-beta.1", true, "prerelease with dot"},
		{"1.0.0-rc.1", true, "release candidate"},
		{"", false, "empty string"},
		{"not-a-version", false, "arbitrary string"},
		{"1.0", false, "missing patch"},
		{"1", false, "only major"},
		{"v1.0.0", true, "v-prefix (semver lib accepts)"},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			err := ValidateVersion(tt.version)
			if tt.valid {
				assert.NoError(t, err, "expected %q to be valid", tt.version)
			} else {
				assert.Error(t, err, "expected %q to be invalid", tt.version)
			}
		})
	}
}

func TestValidateDescriptionLength(t *testing.T) {
	tests := []struct {
		length int
		valid  bool
	}{
		{0, false},
		{29, false},
		{30, true},
		{100, true},
		{1024, true},
		{1025, false},
	}

	for _, tt := range tests {
		m := &Manifest{
			Name:        "test-skill",
			Version:     "1.0.0",
			Description: strings.Repeat("a", tt.length),
		}
		err := Validate(m)
		if tt.valid {
			assert.NoError(t, err, "description length %d should be valid", tt.length)
		} else {
			assert.Error(t, err, "description length %d should be invalid", tt.length)
		}
	}
}

func TestValidateKeywordsConstraints(t *testing.T) {
	t.Run("nil keywords is valid", func(t *testing.T) {
		m := validManifest()
		m.Keywords = nil
		assert.NoError(t, Validate(m))
	})

	t.Run("empty keywords is valid", func(t *testing.T) {
		m := validManifest()
		m.Keywords = []string{}
		assert.NoError(t, Validate(m))
	})

	t.Run("too many keywords", func(t *testing.T) {
		m := validManifest()
		m.Keywords = make([]string, 21)
		for i := range m.Keywords {
			m.Keywords[i] = "kw"
		}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "keywords")
	})

	t.Run("keyword too long", func(t *testing.T) {
		m := validManifest()
		m.Keywords = []string{strings.Repeat("x", 51)}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "keyword")
	})
}

func TestValidateCategoriesConstraints(t *testing.T) {
	t.Run("nil categories is valid", func(t *testing.T) {
		m := validManifest()
		m.Categories = nil
		assert.NoError(t, Validate(m))
	})

	t.Run("valid single category", func(t *testing.T) {
		m := validManifest()
		m.Categories = []string{"testing"}
		assert.NoError(t, Validate(m))
	})

	t.Run("valid three categories", func(t *testing.T) {
		m := validManifest()
		m.Categories = []string{"testing", "backend", "security"}
		assert.NoError(t, Validate(m))
	})

	t.Run("too many categories", func(t *testing.T) {
		m := validManifest()
		m.Categories = []string{"testing", "backend", "security", "frontend"}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "categories")
	})

	t.Run("empty categories is invalid", func(t *testing.T) {
		m := validManifest()
		m.Categories = []string{}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "categories")
	})

	t.Run("invalid category value", func(t *testing.T) {
		m := validManifest()
		m.Categories = []string{"not-real"}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "invalid category")
	})
}

func TestValidatePersonConstraints(t *testing.T) {
	t.Run("person with name only is valid", func(t *testing.T) {
		m := validManifest()
		m.Authors = []Person{{Name: "Alice"}}
		assert.NoError(t, Validate(m))
	})

	t.Run("person with email only is valid", func(t *testing.T) {
		m := validManifest()
		m.Authors = []Person{{Email: "alice@example.com"}}
		assert.NoError(t, Validate(m))
	})

	t.Run("person with neither name nor email is invalid", func(t *testing.T) {
		m := validManifest()
		m.Authors = []Person{{URL: "https://alice.dev"}}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "authors")
	})
}

func TestValidateAgentsMinContext(t *testing.T) {
	t.Run("standard is valid", func(t *testing.T) {
		m := validManifest()
		m.Agents = &Agents{MinContext: "standard"}
		assert.NoError(t, Validate(m))
	})

	t.Run("large is valid", func(t *testing.T) {
		m := validManifest()
		m.Agents = &Agents{MinContext: "large"}
		assert.NoError(t, Validate(m))
	})

	t.Run("invalid context value", func(t *testing.T) {
		m := validManifest()
		m.Agents = &Agents{MinContext: "huge"}
		err := Validate(m)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "min_context")
	})
}

func TestValidateMultipleErrors(t *testing.T) {
	m := &Manifest{
		Name:        "X", // too short + invalid
		Version:     "nope",
		Description: "short",
	}
	err := Validate(m)
	require.Error(t, err)
	ve, ok := err.(*ValidationError)
	require.True(t, ok)
	assert.GreaterOrEqual(t, len(ve.Errors), 3, "should have at least 3 errors")
}

func TestValidationErrorString(t *testing.T) {
	ve := &ValidationError{Errors: []string{"a", "b"}}
	assert.Equal(t, "validation failed: a; b", ve.Error())
}

// validManifest returns a manifest that passes all validation.
func validManifest() *Manifest {
	return &Manifest{
		Name:        "test-skill",
		Version:     "1.0.0",
		Description: "A valid test skill that has enough characters in its description",
	}
}
