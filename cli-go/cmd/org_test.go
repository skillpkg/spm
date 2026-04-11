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

func TestOrgCreate(t *testing.T) {
	org := api.OrgInfo{
		ID:          "uuid-123",
		Name:        "mycompany",
		DisplayName: "My Company Inc.",
		MemberCount: 1,
		SkillCount:  0,
		CreatedAt:   "2026-01-01T00:00:00Z",
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "mycompany", body["name"])
		assert.Equal(t, "My Company Inc.", body["display_name"])

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(org)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent
	orgDisplayName = "My Company Inc."
	orgDescription = ""

	err := runOrgCreate(nil, []string{"mycompany"})
	require.NoError(t, err)
}

func TestOrgCreateJSON(t *testing.T) {
	org := api.OrgInfo{
		ID:          "uuid-123",
		Name:        "mycompany",
		DisplayName: "My Company Inc.",
		MemberCount: 1,
		CreatedAt:   "2026-01-01T00:00:00Z",
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(org)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeJSON
	orgDisplayName = "My Company Inc."
	orgDescription = ""

	var buf jsonBuf
	Out.Writer = &buf

	err := runOrgCreate(nil, []string{"mycompany"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.data, &result))
	assert.Equal(t, "mycompany", result["name"])
	assert.Equal(t, "My Company Inc.", result["display_name"])
}

func TestOrgCreateRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgCreate(nil, []string{"mycompany"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestOrgList(t *testing.T) {
	orgs := []api.OrgSummary{
		{Name: "mycompany", DisplayName: "My Company Inc.", Role: "owner", JoinedAt: "2026-01-01T00:00:00Z"},
		{Name: "oss-team", DisplayName: "Open Source Team", Role: "member", JoinedAt: "2026-02-01T00:00:00Z"},
	}

	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if callCount == 0 {
			// whoami call
			assert.Equal(t, "/api/v1/auth/whoami", r.URL.Path)
			_ = json.NewEncoder(w).Encode(api.WhoamiUser{Username: "alice"})
		} else {
			// list orgs call
			assert.Equal(t, "/api/v1/users/alice/orgs", r.URL.Path)
			_ = json.NewEncoder(w).Encode(orgs)
		}
		callCount++
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgList(nil, nil)
	require.NoError(t, err)
}

func TestOrgListJSON(t *testing.T) {
	orgs := []api.OrgSummary{
		{Name: "mycompany", Role: "owner", JoinedAt: "2026-01-01T00:00:00Z"},
	}

	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if callCount == 0 {
			_ = json.NewEncoder(w).Encode(api.WhoamiUser{Username: "alice"})
		} else {
			_ = json.NewEncoder(w).Encode(orgs)
		}
		callCount++
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeJSON

	var buf jsonBuf
	Out.Writer = &buf

	err := runOrgList(nil, nil)
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.data, &result))
	assert.Equal(t, "alice", result["username"])
	assert.Equal(t, float64(1), result["count"])
}

func TestOrgListRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgList(nil, nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestOrgMembers(t *testing.T) {
	members := []api.OrgMember{
		{Username: "alice", Role: "owner", JoinedAt: "2026-01-01T00:00:00Z"},
		{Username: "bob", Role: "admin", JoinedAt: "2026-02-01T00:00:00Z"},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs/mycompany/members", r.URL.Path)
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(members)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgMembers(nil, []string{"mycompany"})
	require.NoError(t, err)
}

func TestOrgMembersJSON(t *testing.T) {
	members := []api.OrgMember{
		{Username: "alice", Role: "owner", JoinedAt: "2026-01-01T00:00:00Z"},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(members)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeJSON

	var buf jsonBuf
	Out.Writer = &buf

	err := runOrgMembers(nil, []string{"mycompany"})
	require.NoError(t, err)

	var result map[string]any
	require.NoError(t, json.Unmarshal(buf.data, &result))
	assert.Equal(t, "mycompany", result["org"])
	assert.Equal(t, float64(1), result["count"])
}

func TestOrgInvite(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs/mycompany/members", r.URL.Path)
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "bob", body["username"])
		assert.Equal(t, "admin", body["role"])

		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent
	orgInviteRole = "admin"

	err := runOrgInvite(nil, []string{"mycompany", "bob"})
	require.NoError(t, err)
}

func TestOrgInviteRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgInvite(nil, []string{"mycompany", "bob"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestOrgRole(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs/mycompany/members/alice", r.URL.Path)
		assert.Equal(t, http.MethodPatch, r.Method)

		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "admin", body["role"])

		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgRole(nil, []string{"mycompany", "alice", "admin"})
	require.NoError(t, err)
}

func TestOrgRoleRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgRole(nil, []string{"mycompany", "alice", "admin"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestOrgRemove(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs/mycompany/members/bob", r.URL.Path)
		assert.Equal(t, http.MethodDelete, r.Method)
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgRemove(nil, []string{"mycompany", "bob"})
	require.NoError(t, err)
}

func TestOrgRemoveRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgRemove(nil, []string{"mycompany", "bob"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestOrgLeave(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if callCount == 0 {
			// whoami call
			assert.Equal(t, "/api/v1/auth/whoami", r.URL.Path)
			_ = json.NewEncoder(w).Encode(api.WhoamiUser{Username: "alice"})
		} else {
			// remove self call
			assert.Equal(t, "/api/v1/orgs/mycompany/members/alice", r.URL.Path)
			assert.Equal(t, http.MethodDelete, r.Method)
			w.WriteHeader(http.StatusNoContent)
		}
		callCount++
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgLeave(nil, []string{"mycompany"})
	require.NoError(t, err)
}

func TestOrgLeaveRequiresAuth(t *testing.T) {
	Cfg = &config.Config{Registry: "http://localhost", Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgLeave(nil, []string{"mycompany"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "authentication required")
}

func TestOrgInfo(t *testing.T) {
	org := api.OrgInfo{
		ID:          "uuid-123",
		Name:        "mycompany",
		DisplayName: "My Company Inc.",
		Description: "Internal tools team",
		MemberCount: 3,
		SkillCount:  5,
		CreatedAt:   "2026-01-01T00:00:00Z",
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs/mycompany", r.URL.Path)
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(org)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: "test-token"}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgInfo(nil, []string{"mycompany"})
	require.NoError(t, err)
}

func TestOrgInfoStripsAtPrefix(t *testing.T) {
	org := api.OrgInfo{
		ID:          "uuid-123",
		Name:        "mycompany",
		MemberCount: 1,
		CreatedAt:   "2026-01-01T00:00:00Z",
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/orgs/mycompany", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(org)
	}))
	defer srv.Close()

	Cfg = &config.Config{Registry: srv.URL, Token: ""}
	Out = output.New()
	Out.Mode = output.ModeSilent

	err := runOrgInfo(nil, []string{"@mycompany"})
	require.NoError(t, err)
}
