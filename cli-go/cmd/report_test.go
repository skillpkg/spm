package cmd

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReport_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/bad-skill/report" && r.Method == http.MethodPost {
			var body map[string]string
			_ = json.NewDecoder(r.Body).Decode(&body)
			assert.Equal(t, "malicious content", body["reason"])
			assert.Equal(t, "high", body["priority"])

			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id":         "rpt-123",
				"skill":      "bad-skill",
				"status":     "pending",
				"created_at": "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	reportReason = "malicious content"
	reportPriority = "high"
	defer func() {
		reportReason = ""
		reportPriority = "normal"
	}()

	err := runReport(nil, []string{"bad-skill"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "report", result["command"])
	assert.Equal(t, "success", result["status"])
	assert.Equal(t, "rpt-123", result["id"])
	assert.Equal(t, "bad-skill", result["skill"])
	assert.Equal(t, "malicious content", result["reason"])
}

func TestReport_NoAuth(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "", Registry: "http://localhost:9999"}
	reportReason = "test"
	defer func() { reportReason = "" }()

	err := runReport(nil, []string{"some-skill"})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "not_logged_in", result["error"])
	} else {
		assert.Contains(t, err.Error(), "not logged in")
	}
}

func TestReport_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":   "skill_not_found",
			"message": "Skill not found",
		})
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	reportReason = "test reason"
	defer func() { reportReason = "" }()

	err := runReport(nil, []string{"missing-skill"})
	_ = err

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "skill_not_found", result["error"])
}

func TestReport_RateLimited(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":   "rate_limited",
			"message": "Too many requests",
		})
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	reportReason = "test reason"
	defer func() { reportReason = "" }()

	err := runReport(nil, []string{"some-skill"})
	_ = err

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "rate_limited", result["error"])
}

func TestReport_HumanOutput(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(map[string]any{
				"id":         "rpt-456",
				"skill":      "bad-skill",
				"status":     "pending",
				"created_at": "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	reportReason = "bad content"
	reportPriority = "normal"
	defer func() {
		reportReason = ""
		reportPriority = "normal"
	}()

	err := runReport(nil, []string{"bad-skill"})
	require.NoError(t, err)
	assert.Contains(t, buf.String(), "Report submitted")
	assert.Contains(t, buf.String(), "rpt-456")
}
