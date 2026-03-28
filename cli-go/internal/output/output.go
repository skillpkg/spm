package output

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/briandowns/spinner"
	"github.com/fatih/color"
)

// Mode controls how output is formatted.
type Mode int

const (
	// ModeHuman is the default output mode with colors and formatting.
	ModeHuman Mode = iota
	// ModeVerbose includes extra debug information.
	ModeVerbose
	// ModeJSON outputs structured JSON only.
	ModeJSON
	// ModeSilent suppresses all non-error output.
	ModeSilent
)

// Icons used in CLI output.
var Icons = map[string]string{
	"success": "✓",
	"error":   "✗",
	"warning": "⚠",
	"info":    "ℹ",
	"arrow":   "→",
	"package": "📦",
	"lock":    "🔒",
	"key":     "🔑",
	"search":  "🔍",
	"star":    "⭐",
	"fire":    "🔥",
	"check":   "✔",
}

// RequiredIcons is the set of icon keys that must exist.
var RequiredIcons = []string{
	"success", "error", "warning", "info", "arrow",
	"package", "lock", "key", "search", "star",
}

// Color helpers.
var (
	Green  = color.New(color.FgGreen).SprintFunc()
	Red    = color.New(color.FgRed).SprintFunc()
	Yellow = color.New(color.FgYellow).SprintFunc()
	Cyan   = color.New(color.FgCyan).SprintFunc()
	Bold   = color.New(color.Bold).SprintFunc()
	Dim    = color.New(color.Faint).SprintFunc()
)

// Output manages CLI output based on the current mode.
type Output struct {
	Mode   Mode
	Writer io.Writer
	ErrW   io.Writer
}

// New creates an Output with defaults (human mode, stdout/stderr).
func New() *Output {
	return &Output{
		Mode:   ModeHuman,
		Writer: os.Stdout,
		ErrW:   os.Stderr,
	}
}

// Log prints a message in human and verbose modes. Suppressed in JSON and silent.
func (o *Output) Log(format string, args ...any) {
	if o.Mode == ModeJSON || o.Mode == ModeSilent {
		return
	}
	fmt.Fprintf(o.Writer, format+"\n", args...)
}

// LogVerbose prints a message only in verbose mode.
func (o *Output) LogVerbose(format string, args ...any) {
	if o.Mode != ModeVerbose {
		return
	}
	msg := fmt.Sprintf("[verbose] "+format, args...)
	fmt.Fprintf(o.Writer, "%s\n", Dim(msg))
}

// LogJSON outputs a value as JSON. Only active in JSON mode.
func (o *Output) LogJSON(v any) error {
	if o.Mode != ModeJSON {
		return nil
	}
	enc := json.NewEncoder(o.Writer)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

// LogError prints an error message. Always printed except in JSON mode
// (where errors should be part of the JSON structure).
func (o *Output) LogError(format string, args ...any) {
	if o.Mode == ModeJSON {
		return
	}
	msg := fmt.Sprintf("%s %s", Icons["error"], fmt.Sprintf(format, args...))
	fmt.Fprintf(o.ErrW, "%s\n", Red(msg))
}

// StartSpinner creates and starts a terminal spinner. Returns nil in non-human modes.
func (o *Output) StartSpinner(message string) *spinner.Spinner {
	if o.Mode != ModeHuman && o.Mode != ModeVerbose {
		return nil
	}
	s := spinner.New(spinner.CharSets[14], 80*time.Millisecond)
	s.Suffix = " " + message
	s.Writer = o.ErrW
	s.Start()
	return s
}

// StopSpinner stops a spinner if it is non-nil.
func StopSpinner(s *spinner.Spinner) {
	if s != nil {
		s.Stop()
	}
}
