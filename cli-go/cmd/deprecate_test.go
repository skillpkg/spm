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

func TestDeprecate_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/my-skill" && r.Method == http.MethodPatch {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{
				"name":           "my-skill",
				"deprecated":     true,
				"deprecated_msg": "Use new-skill instead",
				"updated_at":     "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	deprecateMessage = "Use new-skill instead"
	deprecateUndo = false
	defer func() {
		deprecateMessage = ""
		deprecateUndo = false
	}()

	err := runDeprecate(nil, []string{"my-skill"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "deprecate", result["command"])
	assert.Equal(t, "success", result["status"])
	assert.Equal(t, "my-skill", result["name"])
	assert.Equal(t, true, result["deprecated"])
	assert.Equal(t, "Use new-skill instead", result["message"])
}

func TestDeprecate_Undo(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v1/skills/my-skill" && r.Method == http.MethodPatch {
			var body map[string]any
			json.NewDecoder(r.Body).Decode(&body)
			assert.Equal(t, false, body["deprecated"])

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{
				"name":       "my-skill",
				"deprecated": false,
				"updated_at": "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	deprecateUndo = true
	deprecateMessage = ""
	defer func() {
		deprecateUndo = false
		deprecateMessage = ""
	}()

	err := runDeprecate(nil, []string{"my-skill"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, false, result["deprecated"])
}

func TestDeprecate_NoAuth(t *testing.T) {
	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "", Registry: "http://localhost:9999"}
	deprecateUndo = false
	deprecateMessage = ""

	err := runDeprecate(nil, []string{"my-skill"})
	if err == nil {
		var result map[string]any
		require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
		assert.Equal(t, "not_logged_in", result["error"])
	} else {
		assert.Contains(t, err.Error(), "not logged in")
	}
}

func TestDeprecate_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]any{
			"error":   "skill_not_found",
			"message": "Skill not found",
		})
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeJSON, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	deprecateUndo = false
	deprecateMessage = "deprecated"
	defer func() {
		deprecateMessage = ""
		deprecateUndo = false
	}()

	err := runDeprecate(nil, []string{"no-such-skill"})
	_ = err

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.Bytes(), &result))
	assert.Equal(t, "skill_not_found", result["error"])
}

func TestDeprecate_DefaultMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPatch {
			var body map[string]any
			json.NewDecoder(r.Body).Decode(&body)
			// Default message should be set
			assert.Equal(t, "This skill has been deprecated.", body["deprecated_msg"])

			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]any{
				"name":           "my-skill",
				"deprecated":     true,
				"deprecated_msg": "This skill has been deprecated.",
				"updated_at":     "2024-01-01T00:00:00Z",
			})
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	var buf bytes.Buffer
	Out = &output.Output{Mode: output.ModeHuman, Writer: &buf, ErrW: &buf}
	Cfg = &config.Config{Token: "test-token", Registry: server.URL}
	deprecateUndo = false
	deprecateMessage = ""
	defer func() {
		deprecateMessage = ""
		deprecateUndo = false
	}()

	err := runDeprecate(nil, []string{"my-skill"})
	require.NoError(t, err)
	assert.Contains(t, buf.String(), "Deprecated")
}
