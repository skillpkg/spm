package manifest

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/Masterminds/semver/v3"
)

// Validation constraints matching @spm/shared schemas.
const (
	NameMinLen         = 2
	NameMaxLen         = 64
	DescriptionMinLen  = 30
	DescriptionMaxLen  = 1024
	KeywordMaxLen      = 50
	KeywordsMaxCount   = 20
	CategoriesMinCount = 1
	CategoriesMaxCount = 3
)

// nameRegex matches kebab-case names with optional @scope/ prefix.
// Must start with a letter, 2-64 chars total.
var nameRegex = regexp.MustCompile(`^(@[a-z0-9-]+/)?[a-z][a-z0-9-]*$`)

// ValidationError collects multiple validation failures.
type ValidationError struct {
	Errors []string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed: %s", strings.Join(e.Errors, "; "))
}

// HasErrors returns true if there are any validation errors.
func (e *ValidationError) HasErrors() bool {
	return len(e.Errors) > 0
}

// Validate checks a manifest against all constraints.
// Returns nil if valid, or a *ValidationError with all issues.
func Validate(m *Manifest) error {
	ve := &ValidationError{}

	validateName(m.Name, ve)
	validateVersion(m.Version, ve)
	validateDescription(m.Description, ve)
	validateKeywords(m.Keywords, ve)
	validateCategories(m.Categories, ve)
	validatePersons(m.Authors, "authors", ve)
	validatePersons(m.Maintainers, "maintainers", ve)
	validateAgents(m.Agents, ve)

	if ve.HasErrors() {
		return ve
	}
	return nil
}

func validateName(name string, ve *ValidationError) {
	if len(name) < NameMinLen {
		ve.Errors = append(ve.Errors, fmt.Sprintf("name must be at least %d characters", NameMinLen))
		return
	}
	if len(name) > NameMaxLen {
		ve.Errors = append(ve.Errors, fmt.Sprintf("name must be at most %d characters", NameMaxLen))
		return
	}
	if !nameRegex.MatchString(name) {
		ve.Errors = append(ve.Errors, "name must be kebab-case, start with a letter, optionally scoped with @org/")
	}
}

// semverStrict matches strict semver: MAJOR.MINOR.PATCH with optional prerelease.
var semverStrict = regexp.MustCompile(`^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$`)

func validateVersion(version string, ve *ValidationError) {
	if version == "" {
		ve.Errors = append(ve.Errors, "version is required")
		return
	}
	// Strip optional "v" prefix for validation (Masterminds/semver accepts it)
	v := version
	if len(v) > 0 && v[0] == 'v' {
		v = v[1:]
	}
	if !semverStrict.MatchString(v) {
		ve.Errors = append(ve.Errors, fmt.Sprintf("version must be valid semver (MAJOR.MINOR.PATCH): %s", version))
		return
	}
	if _, err := semver.NewVersion(version); err != nil {
		ve.Errors = append(ve.Errors, fmt.Sprintf("version must be valid semver: %s", version))
	}
}

func validateDescription(desc string, ve *ValidationError) {
	if len(desc) < DescriptionMinLen {
		ve.Errors = append(ve.Errors, fmt.Sprintf("description must be at least %d characters", DescriptionMinLen))
	}
	if len(desc) > DescriptionMaxLen {
		ve.Errors = append(ve.Errors, fmt.Sprintf("description must be at most %d characters", DescriptionMaxLen))
	}
}

func validateKeywords(keywords []string, ve *ValidationError) {
	if keywords == nil {
		return
	}
	if len(keywords) > KeywordsMaxCount {
		ve.Errors = append(ve.Errors, fmt.Sprintf("keywords must have at most %d items", KeywordsMaxCount))
	}
	for i, kw := range keywords {
		if len(kw) > KeywordMaxLen {
			ve.Errors = append(ve.Errors, fmt.Sprintf("keyword[%d] must be at most %d characters", i, KeywordMaxLen))
		}
	}
}

func validateCategories(categories []string, ve *ValidationError) {
	if categories == nil {
		return // Optional; defaults to ["other"]
	}
	if len(categories) < CategoriesMinCount {
		ve.Errors = append(ve.Errors, fmt.Sprintf("categories must have at least %d item", CategoriesMinCount))
	}
	if len(categories) > CategoriesMaxCount {
		ve.Errors = append(ve.Errors, fmt.Sprintf("categories must have at most %d items", CategoriesMaxCount))
	}
	for _, cat := range categories {
		if !IsValidCategory(cat) {
			ve.Errors = append(ve.Errors, fmt.Sprintf("invalid category: %s", cat))
		}
	}
}

func validatePersons(persons []Person, field string, ve *ValidationError) {
	for i, p := range persons {
		if p.Name == "" && p.Email == "" {
			ve.Errors = append(ve.Errors, fmt.Sprintf("%s[%d]: at least one of name or email is required", field, i))
		}
	}
}

func validateAgents(agents *Agents, ve *ValidationError) {
	if agents == nil {
		return
	}
	validContexts := map[string]bool{"standard": true, "large": true, "": true}
	if !validContexts[agents.MinContext] {
		ve.Errors = append(ve.Errors, fmt.Sprintf("agents.min_context must be 'standard' or 'large', got '%s'", agents.MinContext))
	}
}

// ValidateName validates just the name field.
func ValidateName(name string) error {
	ve := &ValidationError{}
	validateName(name, ve)
	if ve.HasErrors() {
		return ve
	}
	return nil
}

// ValidateVersion validates just the version field.
func ValidateVersion(version string) error {
	ve := &ValidationError{}
	validateVersion(version, ve)
	if ve.HasErrors() {
		return ve
	}
	return nil
}
