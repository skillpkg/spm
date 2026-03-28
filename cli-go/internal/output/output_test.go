package output

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequiredIconsExist(t *testing.T) {
	for _, key := range RequiredIcons {
		_, ok := Icons[key]
		assert.True(t, ok, "missing required icon: %s", key)
	}
}

func TestIconSetCompleteness(t *testing.T) {
	// All required icons must be non-empty strings
	for _, key := range RequiredIcons {
		assert.NotEmpty(t, Icons[key], "icon %s must not be empty", key)
	}
}

func TestNewDefaults(t *testing.T) {
	o := New()
	assert.Equal(t, ModeHuman, o.Mode)
	assert.NotNil(t, o.Writer)
	assert.NotNil(t, o.ErrW)
}

func TestModeSwitching(t *testing.T) {
	o := New()

	o.Mode = ModeHuman
	assert.Equal(t, ModeHuman, o.Mode)

	o.Mode = ModeVerbose
	assert.Equal(t, ModeVerbose, o.Mode)

	o.Mode = ModeJSON
	assert.Equal(t, ModeJSON, o.Mode)

	o.Mode = ModeSilent
	assert.Equal(t, ModeSilent, o.Mode)
}

func TestLogHumanMode(t *testing.T) {
	var buf bytes.Buffer
	o := &Output{Mode: ModeHuman, Writer: &buf, ErrW: &bytes.Buffer{}}

	o.Log("hello %s", "world")
	assert.Contains(t, buf.String(), "hello world")
}

func TestLogVerboseModeShowsLog(t *testing.T) {
	var buf bytes.Buffer
	o := &Output{Mode: ModeVerbose, Writer: &buf, ErrW: &bytes.Buffer{}}

	o.Log("hello %s", "world")
	assert.Contains(t, buf.String(), "hello world")
}

func TestLogSuppressedInJSON(t *testing.T) {
	var buf bytes.Buffer
	o := &Output{Mode: ModeJSON, Writer: &buf, ErrW: &bytes.Buffer{}}

	o.Log("hello %s", "world")
	assert.Empty(t, buf.String())
}

func TestLogSuppressedInSilent(t *testing.T) {
	var buf bytes.Buffer
	o := &Output{Mode: ModeSilent, Writer: &buf, ErrW: &bytes.Buffer{}}

	o.Log("hello %s", "world")
	assert.Empty(t, buf.String())
}

func TestLogVerboseOnlyInVerboseMode(t *testing.T) {
	tests := []struct {
		mode     Mode
		expected bool
	}{
		{ModeHuman, false},
		{ModeVerbose, true},
		{ModeJSON, false},
		{ModeSilent, false},
	}

	for _, tt := range tests {
		var buf bytes.Buffer
		o := &Output{Mode: tt.mode, Writer: &buf, ErrW: &bytes.Buffer{}}
		o.LogVerbose("debug info")
		if tt.expected {
			assert.NotEmpty(t, buf.String(), "mode %d should show verbose output", tt.mode)
		} else {
			assert.Empty(t, buf.String(), "mode %d should suppress verbose output", tt.mode)
		}
	}
}

func TestLogJSONOnlyInJSONMode(t *testing.T) {
	data := map[string]string{"key": "value"}

	tests := []struct {
		mode     Mode
		expected bool
	}{
		{ModeHuman, false},
		{ModeVerbose, false},
		{ModeJSON, true},
		{ModeSilent, false},
	}

	for _, tt := range tests {
		var buf bytes.Buffer
		o := &Output{Mode: tt.mode, Writer: &buf, ErrW: &bytes.Buffer{}}
		err := o.LogJSON(data)
		require.NoError(t, err)
		if tt.expected {
			assert.NotEmpty(t, buf.String(), "mode %d should output JSON", tt.mode)
			var parsed map[string]string
			err := json.Unmarshal(buf.Bytes(), &parsed)
			require.NoError(t, err)
			assert.Equal(t, "value", parsed["key"])
		} else {
			assert.Empty(t, buf.String(), "mode %d should suppress JSON output", tt.mode)
		}
	}
}

func TestLogErrorSuppressedInJSON(t *testing.T) {
	var errBuf bytes.Buffer
	o := &Output{Mode: ModeJSON, Writer: &bytes.Buffer{}, ErrW: &errBuf}

	o.LogError("something failed")
	assert.Empty(t, errBuf.String())
}

func TestLogErrorShownInHumanMode(t *testing.T) {
	var errBuf bytes.Buffer
	o := &Output{Mode: ModeHuman, Writer: &bytes.Buffer{}, ErrW: &errBuf}

	o.LogError("something failed")
	assert.Contains(t, errBuf.String(), "something failed")
}

func TestLogErrorShownInSilentMode(t *testing.T) {
	var errBuf bytes.Buffer
	o := &Output{Mode: ModeSilent, Writer: &bytes.Buffer{}, ErrW: &errBuf}

	o.LogError("something failed")
	assert.Contains(t, errBuf.String(), "something failed")
}

func TestStartSpinnerReturnsNilInJSONMode(t *testing.T) {
	o := &Output{Mode: ModeJSON, Writer: &bytes.Buffer{}, ErrW: &bytes.Buffer{}}
	s := o.StartSpinner("loading...")
	assert.Nil(t, s)
}

func TestStartSpinnerReturnsNilInSilentMode(t *testing.T) {
	o := &Output{Mode: ModeSilent, Writer: &bytes.Buffer{}, ErrW: &bytes.Buffer{}}
	s := o.StartSpinner("loading...")
	assert.Nil(t, s)
}

func TestStopSpinnerHandlesNil(t *testing.T) {
	// Should not panic
	StopSpinner(nil)
}

func TestColorFunctionsReturnStrings(t *testing.T) {
	assert.IsType(t, "", Green("test"))
	assert.IsType(t, "", Red("test"))
	assert.IsType(t, "", Yellow("test"))
	assert.IsType(t, "", Cyan("test"))
	assert.IsType(t, "", Bold("test"))
	assert.IsType(t, "", Dim("test"))
}
