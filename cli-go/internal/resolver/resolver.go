package resolver

import (
	"fmt"
	"strings"
)

// Specifier represents a parsed skill specifier like "name@version".
type Specifier struct {
	// Scope is the optional @org prefix (without the @).
	Scope string
	// Name is the skill name (without scope).
	Name string
	// VersionRange is the version constraint (e.g., "1.0.0", "^1.0.0", "latest", "*", ">=1.0.0").
	// Empty string means "latest".
	VersionRange string
}

// FullName returns the full skill name including scope if present.
func (s *Specifier) FullName() string {
	if s.Scope != "" {
		return "@" + s.Scope + "/" + s.Name
	}
	return s.Name
}

// String returns the full specifier string.
func (s *Specifier) String() string {
	if s.VersionRange != "" {
		return s.FullName() + "@" + s.VersionRange
	}
	return s.FullName()
}

// IsLatest returns true if the specifier targets the latest version.
func (s *Specifier) IsLatest() bool {
	return s.VersionRange == "" || s.VersionRange == "latest"
}

// Parse parses a skill specifier string into a Specifier.
//
// Supported formats:
//   - "name"                 → name, latest
//   - "name@1.0.0"           → name, =1.0.0
//   - "name@^1.0.0"          → name, ^1.0.0
//   - "name@~1.2.0"          → name, ~1.2.0
//   - "name@latest"          → name, latest
//   - "name@*"               → name, *
//   - "name@>=1.0.0"         → name, >=1.0.0
//   - "@scope/name"          → @scope/name, latest
//   - "@scope/name@1.0.0"    → @scope/name, =1.0.0
//   - "@scope/name@^1.0.0"   → @scope/name, ^1.0.0
func Parse(input string) (*Specifier, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return nil, fmt.Errorf("empty specifier")
	}

	spec := &Specifier{}

	if strings.HasPrefix(input, "@") {
		// Scoped package: @scope/name or @scope/name@version
		// Find the "/" that separates scope from name
		slashIdx := strings.Index(input, "/")
		if slashIdx < 0 {
			return nil, fmt.Errorf("scoped specifier missing '/': %s", input)
		}

		scope := input[1:slashIdx] // strip leading @
		if scope == "" {
			return nil, fmt.Errorf("empty scope in specifier: %s", input)
		}
		spec.Scope = scope

		rest := input[slashIdx+1:]
		if rest == "" {
			return nil, fmt.Errorf("empty name in scoped specifier: %s", input)
		}

		// Check for @version in the rest
		atIdx := strings.Index(rest, "@")
		if atIdx >= 0 {
			spec.Name = rest[:atIdx]
			spec.VersionRange = rest[atIdx+1:]
		} else {
			spec.Name = rest
		}
	} else {
		// Unscoped: name or name@version
		atIdx := strings.Index(input, "@")
		if atIdx >= 0 {
			spec.Name = input[:atIdx]
			spec.VersionRange = input[atIdx+1:]
		} else {
			spec.Name = input
		}
	}

	if spec.Name == "" {
		return nil, fmt.Errorf("empty name in specifier: %s", input)
	}

	return spec, nil
}
