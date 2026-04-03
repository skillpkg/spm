package resolver

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseSpecifiers(t *testing.T) {
	tests := []struct {
		input        string
		wantScope    string
		wantName     string
		wantVersion  string
		wantFull     string
		wantIsLatest bool
		desc         string
	}{
		{
			input: "my-skill", wantScope: "", wantName: "my-skill",
			wantVersion: "", wantFull: "my-skill", wantIsLatest: true,
			desc: "bare name",
		},
		{
			input: "my-skill@1.0.0", wantScope: "", wantName: "my-skill",
			wantVersion: "1.0.0", wantFull: "my-skill", wantIsLatest: false,
			desc: "name with exact version",
		},
		{
			input: "my-skill@^1.0.0", wantScope: "", wantName: "my-skill",
			wantVersion: "^1.0.0", wantFull: "my-skill", wantIsLatest: false,
			desc: "name with caret range",
		},
		{
			input: "my-skill@~1.2.0", wantScope: "", wantName: "my-skill",
			wantVersion: "~1.2.0", wantFull: "my-skill", wantIsLatest: false,
			desc: "name with tilde range",
		},
		{
			input: "my-skill@latest", wantScope: "", wantName: "my-skill",
			wantVersion: "latest", wantFull: "my-skill", wantIsLatest: true,
			desc: "name with latest tag",
		},
		{
			input: "my-skill@*", wantScope: "", wantName: "my-skill",
			wantVersion: "*", wantFull: "my-skill", wantIsLatest: false,
			desc: "name with wildcard",
		},
		{
			input: "my-skill@>=1.0.0", wantScope: "", wantName: "my-skill",
			wantVersion: ">=1.0.0", wantFull: "my-skill", wantIsLatest: false,
			desc: "name with gte range",
		},
		{
			input: "@scope/my-skill", wantScope: "scope", wantName: "my-skill",
			wantVersion: "", wantFull: "@scope/my-skill", wantIsLatest: true,
			desc: "scoped bare name",
		},
		{
			input: "@scope/my-skill@1.0.0", wantScope: "scope", wantName: "my-skill",
			wantVersion: "1.0.0", wantFull: "@scope/my-skill", wantIsLatest: false,
			desc: "scoped with exact version",
		},
		{
			input: "@scope/my-skill@^1.0.0", wantScope: "scope", wantName: "my-skill",
			wantVersion: "^1.0.0", wantFull: "@scope/my-skill", wantIsLatest: false,
			desc: "scoped with caret range",
		},
		{
			input: "@scope/my-skill@~1.2.0", wantScope: "scope", wantName: "my-skill",
			wantVersion: "~1.2.0", wantFull: "@scope/my-skill", wantIsLatest: false,
			desc: "scoped with tilde range",
		},
		{
			input: "@my-org/data-pipeline@latest", wantScope: "my-org", wantName: "data-pipeline",
			wantVersion: "latest", wantFull: "@my-org/data-pipeline", wantIsLatest: true,
			desc: "scoped with latest",
		},
		{
			input: "  my-skill@1.0.0  ", wantScope: "", wantName: "my-skill",
			wantVersion: "1.0.0", wantFull: "my-skill", wantIsLatest: false,
			desc: "trimmed whitespace",
		},
		{
			input: "skillpkg/ship", wantScope: "skillpkg", wantName: "ship",
			wantVersion: "", wantFull: "@skillpkg/ship", wantIsLatest: true,
			desc: "unscoped org/name format",
		},
		{
			input: "skillpkg/ship@1.0.0", wantScope: "skillpkg", wantName: "ship",
			wantVersion: "1.0.0", wantFull: "@skillpkg/ship", wantIsLatest: false,
			desc: "unscoped org/name with version",
		},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			spec, err := Parse(tt.input)
			require.NoError(t, err)
			assert.Equal(t, tt.wantScope, spec.Scope)
			assert.Equal(t, tt.wantName, spec.Name)
			assert.Equal(t, tt.wantVersion, spec.VersionRange)
			assert.Equal(t, tt.wantFull, spec.FullName())
			assert.Equal(t, tt.wantIsLatest, spec.IsLatest())
		})
	}
}

func TestParseInvalidSpecifiers(t *testing.T) {
	tests := []struct {
		input string
		desc  string
	}{
		{"", "empty string"},
		{"  ", "whitespace only"},
		{"@/skill", "empty scope"},
		{"@scope/", "empty name after scope"},
		{"@scope", "scope without slash"},
	}

	for _, tt := range tests {
		t.Run(tt.desc, func(t *testing.T) {
			_, err := Parse(tt.input)
			assert.Error(t, err, "expected error for input %q", tt.input)
		})
	}
}

func TestSpecifierString(t *testing.T) {
	tests := []struct {
		spec *Specifier
		want string
	}{
		{&Specifier{Name: "skill"}, "skill"},
		{&Specifier{Name: "skill", VersionRange: "1.0.0"}, "skill@1.0.0"},
		{&Specifier{Scope: "org", Name: "skill"}, "@org/skill"},
		{&Specifier{Scope: "org", Name: "skill", VersionRange: "^1.0.0"}, "@org/skill@^1.0.0"},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.want, tt.spec.String())
	}
}
