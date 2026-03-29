package cmd

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/config"
	"github.com/skillpkg/spm/internal/output"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCollabList(t *testing.T) {
	collabs := []api.Collaborator{
		{Username: "alice", Role: "owner", AddedAt: "2024-01-01T00:00:00Z"},
		{Username: "bob", Role: "maintainer", AddedAt: "2024-06-15T00:00:00Z"},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/skills/my-skill/collaborators", r.URL.Path)
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(collabs)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runCollabList(nil, []string{"my-skill"})
	require.NoError(t, err)
}

func TestCollabListJSON(t *testing.T) {
	collabs := []api.Collaborator{
		{Username: "alice", Role: "owner", AddedAt: "2024-01-01T00:00:00Z"},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(collabs)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeJSON

	// Capture JSON output
	var buf jsonBuf
	Out.Writer = &buf

	err := runCollabList(nil, []string{"my-skill"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.data, &result))
	assert.Equal(t, "my-skill", result["skill"])
	assert.Equal(t, float64(1), result["count"])
}

func TestCollabAdd(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/skills/my-skill/collaborators", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		var body api.CollaboratorAction
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "bob", body.Username)
		assert.Equal(t, "maintainer", body.Role)

		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent
	collabRole = "maintainer"

	err := runCollabAdd(nil, []string{"my-skill", "bob"})
	require.NoError(t, err)
}

func TestCollabAddRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runCollabAdd(nil, []string{"my-skill", "bob"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestCollabRemove(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/skills/my-skill/collaborators/bob", r.URL.Path)
		assert.Equal(t, http.MethodDelete, r.Method)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runCollabRemove(nil, []string{"my-skill", "bob"})
	require.NoError(t, err)
}

func TestCollabRemoveRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runCollabRemove(nil, []string{"my-skill", "bob"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

// jsonBuf captures written bytes.
type jsonBuf struct {
	data []byte
}

func (b *jsonBuf) Write(p []byte) (int, error) {
	b.data = append(b.data, p...)
	return len(p), nil
}
