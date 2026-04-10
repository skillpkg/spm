package api

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestServer creates an httptest.Server with the given handler.
// The handler receives requests at /api/v1/... paths.
func newTestServer(t *testing.T, handler http.Handler) (*httptest.Server, *Client) {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	client := NewClient(srv.URL, "test-token")
	return srv, client
}

func jsonHandler(t *testing.T, status int, body any) http.HandlerFunc {
	t.Helper()
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		if body != nil {
			if err := json.NewEncoder(w).Encode(body); err != nil {
				t.Fatalf("encoding response: %v", err)
			}
		}
	}
}

// --- skillPath ---

func TestSkillPath_Unscoped(t *testing.T) {
	assert.Equal(t, "/data-viz", skillPath("data-viz"))
}

func TestSkillPath_Scoped(t *testing.T) {
	assert.Equal(t, "/@alice/data-viz", skillPath("@alice/data-viz"))
}

func TestSkillPath_ScopedSpecialChars(t *testing.T) {
	// Name part gets PathEscaped, scope does not (it's a path segment)
	assert.Equal(t, "/@my-org/my-skill", skillPath("@my-org/my-skill"))
}

func TestSkillPath_AtWithoutSlash(t *testing.T) {
	// Edge case: starts with @ but no slash — falls through to PathEscape (@ is valid in paths)
	assert.Equal(t, "/@noslash", skillPath("@noslash"))
}

// --- Scoped name integration tests ---

func TestInfo_Scoped(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/@alice/data-viz", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SkillInfo{
			Name:          "@alice/data-viz",
			LatestVersion: "2.0.0",
			Author:        Author{Username: "alice"},
		})
	})

	_, client := newTestServer(t, mux)
	info, err := client.Info("@alice/data-viz")
	require.NoError(t, err)
	assert.Equal(t, "@alice/data-viz", info.Name)
	assert.Equal(t, "2.0.0", info.LatestVersion)
}

func TestGetVersion_Scoped(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/@org/my-skill/1.0.0", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(VersionInfo{
			Name:    "@org/my-skill",
			Version: "1.0.0",
		})
	})

	_, client := newTestServer(t, mux)
	ver, err := client.GetVersion("@org/my-skill", "1.0.0")
	require.NoError(t, err)
	assert.Equal(t, "1.0.0", ver.Version)
}

func TestDownloadURL_Scoped(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/@alice/data-viz/1.0.0/download", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "https://r2.example.com/scoped.skl", http.StatusFound)
	})

	_, client := newTestServer(t, mux)
	u, err := client.DownloadURL("@alice/data-viz", "1.0.0")
	require.NoError(t, err)
	assert.Equal(t, "https://r2.example.com/scoped.skl", u)
}

// --- Auth header tests ---

func TestAuthHeader_Present(t *testing.T) {
	var gotAuth string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/whoami", func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(WhoamiUser{Username: "testuser"})
	})

	_, client := newTestServer(t, mux)
	client.Token = "my-secret-token"

	_, err := client.Whoami()
	require.NoError(t, err)
	assert.Equal(t, "Bearer my-secret-token", gotAuth)
}

func TestAuthHeader_Absent(t *testing.T) {
	var gotAuth string
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SearchResponse{})
	})

	_, client := newTestServer(t, mux)
	client.Token = ""

	_, err := client.Search(SearchParams{})
	require.NoError(t, err)
	assert.Empty(t, gotAuth)
}

// --- Search ---

func TestSearch_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "test", r.URL.Query().Get("q"))
		assert.Equal(t, "data-viz", r.URL.Query().Get("category"))

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SearchResponse{
			Results: []SearchResult{{Name: "data-viz", Version: "1.0.0"}},
			Total:   1,
			Page:    1,
			PerPage: 20,
			Pages:   1,
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Search(SearchParams{Query: "test", Category: "data-viz"})
	require.NoError(t, err)
	assert.Equal(t, 1, resp.Total)
	assert.Equal(t, "data-viz", resp.Results[0].Name)
}

// --- Info ---

func TestInfo_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/data-viz", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SkillInfo{
			Name:          "data-viz",
			LatestVersion: "1.2.3",
			Author:        Author{Username: "almog"},
		})
	})

	_, client := newTestServer(t, mux)
	info, err := client.Info("data-viz")
	require.NoError(t, err)
	assert.Equal(t, "data-viz", info.Name)
	assert.Equal(t, "1.2.3", info.LatestVersion)
}

func TestInfo_NotFound(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/nonexistent", jsonHandler(t, 404, map[string]string{
		"error":      "skill_not_found",
		"message":    "No skill named 'nonexistent' exists",
		"suggestion": "data-viz",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.Info("nonexistent")
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.Equal(t, 404, apiErr.StatusCode)
	assert.Equal(t, "skill_not_found", apiErr.Code)
	assert.Equal(t, "data-viz", apiErr.Suggestion)
}

// --- GetVersion ---

func TestGetVersion_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/data-viz/1.2.3", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(VersionInfo{
			Name:    "data-viz",
			Version: "1.2.3",
			Yanked:  false,
		})
	})

	_, client := newTestServer(t, mux)
	ver, err := client.GetVersion("data-viz", "1.2.3")
	require.NoError(t, err)
	assert.Equal(t, "1.2.3", ver.Version)
	assert.False(t, ver.Yanked)
}

// --- DownloadURL ---

func TestDownloadURL_Redirect(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/data-viz/1.2.3/download", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		http.Redirect(w, r, "https://r2.example.com/data-viz-1.2.3.skl", http.StatusFound)
	})

	_, client := newTestServer(t, mux)
	url, err := client.DownloadURL("data-viz", "1.2.3")
	require.NoError(t, err)
	assert.Equal(t, "https://r2.example.com/data-viz-1.2.3.skl", url)
}

// --- Publish ---

func TestPublish_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Contains(t, r.Header.Get("Content-Type"), "multipart/form-data")
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		// Verify multipart fields
		err := r.ParseMultipartForm(10 << 20)
		require.NoError(t, err)
		assert.NotEmpty(t, r.FormValue("manifest"))

		_, fh, err := r.FormFile("package")
		require.NoError(t, err)
		assert.Equal(t, "test.skl", fh.Filename)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(PublishResponse{
			Status:  "published",
			Name:    "test-skill",
			Version: "1.0.0",
		})
	})

	_, client := newTestServer(t, mux)
	manifest := []byte(`{"name":"test-skill","version":"1.0.0"}`)
	sklData := strings.NewReader("fake-skl-data")

	resp, err := client.Publish(manifest, sklData, "test.skl", nil)
	require.NoError(t, err)
	assert.Equal(t, "published", resp.Status)
	assert.Equal(t, "test-skill", resp.Name)
}

func TestPublish_WithSigstore(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		err := r.ParseMultipartForm(10 << 20)
		require.NoError(t, err)

		_, _, err = r.FormFile("sigstore_bundle")
		require.NoError(t, err, "sigstore_bundle should be present")

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(PublishResponse{Status: "published", Name: "s", Version: "1.0.0"})
	})

	_, client := newTestServer(t, mux)
	_, err := client.Publish(
		[]byte(`{}`),
		strings.NewReader("data"),
		"s.skl",
		[]byte("sigstore-bundle-data"),
	)
	require.NoError(t, err)
}

// --- Yank ---

func TestYank_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/data-viz/1.2.3", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodDelete, r.Method)

		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "critical bug", body["reason"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(YankResponse{
			Name:    "data-viz",
			Version: "1.2.3",
			Yanked:  true,
			Reason:  "critical bug",
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Yank("data-viz", "1.2.3", "critical bug")
	require.NoError(t, err)
	assert.True(t, resp.Yanked)
}

// --- Deprecate ---

func TestDeprecate_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/old-skill", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPatch, r.Method)

		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, true, body["deprecated"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(DeprecateResponse{
			Name:       "old-skill",
			Deprecated: true,
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Deprecate("old-skill", true, "Use new-skill instead")
	require.NoError(t, err)
	assert.True(t, resp.Deprecated)
}

// --- Report ---

func TestReport_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/bad-skill/report", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)

		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "malicious", body["reason"])
		assert.Equal(t, "high", body["priority"])

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(ReportResponse{
			ID:     "report-123",
			Skill:  "bad-skill",
			Status: "open",
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Report("bad-skill", "malicious", "high")
	require.NoError(t, err)
	assert.Equal(t, "report-123", resp.ID)
}

// --- Collaborators ---

func TestGetCollaborators_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/my-skill/collaborators", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode([]Collaborator{
			{Username: "alice", Role: "maintainer"},
			{Username: "bob", Role: "contributor"},
		})
	})

	_, client := newTestServer(t, mux)
	collabs, err := client.GetCollaborators("my-skill")
	require.NoError(t, err)
	assert.Len(t, collabs, 2)
	assert.Equal(t, "alice", collabs[0].Username)
}

func TestAddCollaborator_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/my-skill/collaborators", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)

		var body CollaboratorAction
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.Equal(t, "alice", body.Username)
		assert.Equal(t, "maintainer", body.Role)

		w.WriteHeader(http.StatusNoContent)
	})

	_, client := newTestServer(t, mux)
	err := client.AddCollaborator("my-skill", "alice", "maintainer")
	require.NoError(t, err)
}

func TestRemoveCollaborator_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/my-skill/collaborators/alice", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodDelete, r.Method)
		w.WriteHeader(http.StatusNoContent)
	})

	_, client := newTestServer(t, mux)
	err := client.RemoveCollaborator("my-skill", "alice")
	require.NoError(t, err)
}

// --- Classify ---

func TestClassify_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/categories/classify", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)

		var body map[string]string
		_ = json.NewDecoder(r.Body).Decode(&body)
		assert.NotEmpty(t, body["skill_md_content"])

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ClassifyResponse{
			SuggestedCategory: "data-viz",
			Confidence:        0.92,
			MatchesManifest:   true,
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Classify("# My Skill\nVisualize data", "data-viz")
	require.NoError(t, err)
	assert.Equal(t, "data-viz", resp.SuggestedCategory)
	assert.InDelta(t, 0.92, resp.Confidence, 0.001)
}

// --- Resolve ---

func TestResolve_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/resolve", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)

		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		skills := body["skills"].([]any)
		assert.Len(t, skills, 1)

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ResolveResponse{
			Resolved: []ResolvedSkill{
				{Name: "data-viz", Version: "1.2.3", DownloadURL: "https://example.com/data-viz.skl"},
			},
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Resolve(
		[]ResolveSkill{{Name: "data-viz", Range: "^1.2.0"}},
		"claude-code",
	)
	require.NoError(t, err)
	assert.Len(t, resp.Resolved, 1)
	assert.Equal(t, "1.2.3", resp.Resolved[0].Version)
}

// --- VerifySignature ---

func TestVerifySignature_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/data-viz/1.2.3/verify-signature", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"verified": true,
			"signer":   "almog@github",
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.VerifySignature("data-viz", "1.2.3")
	require.NoError(t, err)
	assert.Equal(t, true, resp["verified"])
}

// --- Rescan ---

func TestRescan_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/data-viz/1.2.3/rescan", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "scanning",
		})
	})

	_, client := newTestServer(t, mux)
	resp, err := client.Rescan("data-viz", "1.2.3")
	require.NoError(t, err)
	assert.Equal(t, "scanning", resp["status"])
}

// --- Whoami ---

func TestWhoami_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/whoami", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(WhoamiUser{
			ID:              "user-1",
			Username:        "almog",
			GithubLogin:     "almog",
			Email:           "almog@example.com",
			TrustTier:       "verified",
			Role:            "admin",
			SkillsPublished: 3,
			TotalDownloads:  24600,
		})
	})

	_, client := newTestServer(t, mux)
	user, err := client.Whoami()
	require.NoError(t, err)
	assert.Equal(t, "almog", user.Username)
	assert.Equal(t, "almog@example.com", user.Email)
	assert.Equal(t, 3, user.SkillsPublished)
}

func TestWhoami_Unauthorized(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/whoami", jsonHandler(t, 401, map[string]string{
		"error":   "unauthorized",
		"message": "Missing or invalid token",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.Whoami()
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.True(t, apiErr.IsUnauthorized())
}

// --- Logout ---

func TestLogout_Success(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		w.WriteHeader(http.StatusNoContent)
	})

	_, client := newTestServer(t, mux)
	err := client.Logout()
	require.NoError(t, err)
}

// --- Error handling tests ---

func TestError_400(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/bad", jsonHandler(t, 400, map[string]string{
		"error":   "validation_error",
		"message": "Invalid name",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.Info("bad")
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.Equal(t, 400, apiErr.StatusCode)
	assert.Equal(t, "validation_error", apiErr.Code)
}

func TestError_403(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/secret", jsonHandler(t, 403, map[string]string{
		"error":   "forbidden",
		"message": "Insufficient permissions",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.Info("secret")
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.Equal(t, 403, apiErr.StatusCode)
	assert.Equal(t, "forbidden", apiErr.Code)
}

func TestError_409(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(409)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":      "version_exists",
			"message":    "Version 1.0.0 already exists",
			"suggestion": "Run: spm version patch",
		})
	})

	_, client := newTestServer(t, mux)
	_, err := client.Publish([]byte(`{}`), strings.NewReader("data"), "test.skl", nil)
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.True(t, apiErr.IsConflict())
	assert.Equal(t, "version_exists", apiErr.Code)
	assert.NotEmpty(t, apiErr.Suggestion)
}

func TestError_422(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/bad", jsonHandler(t, 422, map[string]string{
		"error":   "validation_error",
		"message": "Invalid manifest",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.Info("bad")
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.True(t, apiErr.IsValidation())
}

func TestError_429(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Retry-After", "23")
		w.WriteHeader(429)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"error":   "rate_limited",
			"message": "Too many requests",
		})
	})

	_, client := newTestServer(t, mux)
	_, err := client.Search(SearchParams{})
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.True(t, apiErr.IsRateLimited())
}

func TestError_500(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/broken", jsonHandler(t, 500, map[string]string{
		"error":   "internal_error",
		"message": "Server error",
	}))

	_, client := newTestServer(t, mux)
	_, err := client.Info("broken")
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.True(t, apiErr.IsServerError())
}

func TestError_DefaultMapping(t *testing.T) {
	// When server returns error without JSON body
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/skills/bad", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(500)
		_, _ = io.WriteString(w, "Internal Server Error")
	})

	_, client := newTestServer(t, mux)
	_, err := client.Info("bad")
	require.Error(t, err)

	var apiErr *APIError
	require.ErrorAs(t, err, &apiErr)
	assert.Equal(t, ErrCodeInternal, apiErr.Code)
	assert.Equal(t, 500, apiErr.StatusCode)
}

// --- NewClient ---

func TestNewClient(t *testing.T) {
	client := NewClient("https://registry.skillpkg.dev", "my-token")
	assert.Equal(t, "https://registry.skillpkg.dev", client.BaseURL)
	assert.Equal(t, "my-token", client.Token)
	assert.NotNil(t, client.HTTPClient)
}

func TestNewClient_TrimsTrailingSlash(t *testing.T) {
	client := NewClient("https://registry.skillpkg.dev/", "")
	assert.Equal(t, "https://registry.skillpkg.dev", client.BaseURL)
}

// --- APIError methods ---

func TestAPIError_Error(t *testing.T) {
	err := &APIError{
		StatusCode: 404,
		Code:       "skill_not_found",
		Message:    "Not found",
	}
	assert.Contains(t, err.Error(), "404")
	assert.Contains(t, err.Error(), "skill_not_found")

	errWithSuggestion := &APIError{
		StatusCode: 404,
		Code:       "skill_not_found",
		Message:    "Not found",
		Suggestion: "try data-viz",
	}
	assert.Contains(t, errWithSuggestion.Error(), "suggestion")
}
