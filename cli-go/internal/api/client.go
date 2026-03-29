package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// jsonUnmarshal is a package-level alias so errors.go can also use it.
var jsonUnmarshal = json.Unmarshal

const (
	defaultTimeout = 30 * time.Second
	apiBasePath    = "/api/v1"
)

// Client is the HTTP client for the SPM registry API.
type Client struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
}

// NewClient creates a new API client.
func NewClient(baseURL, token string) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Token:   token,
		HTTPClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

// --- Response types ---

// Author represents an author in search/info results.
type Author struct {
	Username    string `json:"username"`
	GithubLogin string `json:"github_login,omitempty"`
	TrustTier   string `json:"trust_tier"`
}

// SearchResult represents a single skill in search results.
type SearchResult struct {
	Name            string   `json:"name"`
	Version         string   `json:"version"`
	Description     string   `json:"description"`
	Author          Author   `json:"author"`
	Category        string   `json:"category"`
	Tags            []string `json:"tags"`
	Platforms       []string `json:"platforms"`
	Downloads       int      `json:"downloads"`
	WeeklyDownloads int      `json:"weekly_downloads"`
	RatingAvg       float64  `json:"rating_avg"`
	RatingCount     int      `json:"rating_count"`
	Signed          bool     `json:"signed"`
	License         string   `json:"license"`
	PublishedAt     string   `json:"published_at"`
	UpdatedAt       string   `json:"updated_at"`
}

// SearchResponse is the response from GET /skills.
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
	PerPage int            `json:"per_page"`
	Pages   int            `json:"pages"`
}

// SearchParams are query parameters for the search endpoint.
type SearchParams struct {
	Query    string
	Category string
	Trust    string
	Platform string
	Sort     string
	Page     int
	PerPage  int
}

// SecurityLayer represents a scan layer result.
type SecurityLayer struct {
	Layer      int     `json:"layer"`
	Status     string  `json:"status"`
	Detail     string  `json:"detail,omitempty"`
	Confidence float64 `json:"confidence,omitempty"`
}

// SecurityInfo represents security details for a skill.
type SecurityInfo struct {
	Signed         bool            `json:"signed"`
	SignerIdentity string          `json:"signer_identity,omitempty"`
	ScanStatus     string          `json:"scan_status"`
	ScanLayers     []SecurityLayer `json:"scan_layers,omitempty"`
}

// VersionSummary is a brief version in skill info.
type VersionSummary struct {
	Version     string `json:"version"`
	PublishedAt string `json:"published_at"`
}

// Dependencies represents skill dependencies.
type Dependencies struct {
	Skills   []string `json:"skills"`
	System   []string `json:"system"`
	Packages []string `json:"packages"`
}

// SkillInfo is the response from GET /skills/:name.
type SkillInfo struct {
	Name            string           `json:"name"`
	Description     string           `json:"description"`
	Author          Author           `json:"author"`
	Category        string           `json:"category"`
	Tags            []string         `json:"tags"`
	Platforms       []string         `json:"platforms"`
	License         string           `json:"license"`
	Repository      string           `json:"repository"`
	Deprecated      bool             `json:"deprecated"`
	LatestVersion   string           `json:"latest_version"`
	Downloads       int              `json:"downloads"`
	WeeklyDownloads int              `json:"weekly_downloads"`
	RatingAvg       float64          `json:"rating_avg"`
	RatingCount     int              `json:"rating_count"`
	Security        SecurityInfo     `json:"security"`
	Versions        []VersionSummary `json:"versions"`
	Dependencies    Dependencies     `json:"dependencies"`
	CreatedAt       string           `json:"created_at"`
	UpdatedAt       string           `json:"updated_at"`
}

// VersionInfo is the response from GET /skills/:name/:version.
type VersionInfo struct {
	Name              string `json:"name"`
	Version           string `json:"version"`
	Manifest          any    `json:"manifest"`
	ReadmeMD          string `json:"readme_md"`
	SizeBytes         int    `json:"size_bytes"`
	ChecksumSHA256    string `json:"checksum_sha256"`
	SignerIdentity    string `json:"signer_identity,omitempty"`
	SigstoreBundleURL string `json:"sigstore_bundle_url,omitempty"`
	Yanked            bool   `json:"yanked"`
	PublishedAt       string `json:"published_at"`
}

// PublishScan represents a scan result from publish.
type PublishScan struct {
	Layer      int     `json:"layer"`
	Status     string  `json:"status"`
	Confidence float64 `json:"confidence,omitempty"`
}

// PublishResponse is the response from POST /skills.
type PublishResponse struct {
	Status             string        `json:"status"`
	Name               string        `json:"name"`
	Version            string        `json:"version"`
	URL                string        `json:"url,omitempty"`
	ChecksumSHA256     string        `json:"checksum_sha256,omitempty"`
	Scans              []PublishScan `json:"scans,omitempty"`
	Reason             string        `json:"reason,omitempty"`
	EstimatedReviewHrs int           `json:"estimated_review_hours,omitempty"`
}

// YankResponse is the response from DELETE /skills/:name/:version.
type YankResponse struct {
	Name     string `json:"name"`
	Version  string `json:"version"`
	Yanked   bool   `json:"yanked"`
	Reason   string `json:"reason"`
	YankedAt string `json:"yanked_at"`
}

// DeprecateResponse is the response from PATCH /skills/:name.
type DeprecateResponse struct {
	Name          string `json:"name"`
	Deprecated    bool   `json:"deprecated"`
	DeprecatedMsg string `json:"deprecated_msg,omitempty"`
	UpdatedAt     string `json:"updated_at"`
}

// ReportResponse is the response from POST /skills/:name/report.
type ReportResponse struct {
	ID        string `json:"id"`
	Skill     string `json:"skill"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// ClassifyResponse is the response from POST /categories/classify.
type ClassifyResponse struct {
	SuggestedCategory string  `json:"suggested_category"`
	Confidence        float64 `json:"confidence"`
	MatchesManifest   bool    `json:"matches_manifest"`
	Alternatives      []struct {
		Category   string  `json:"category"`
		Confidence float64 `json:"confidence"`
	} `json:"alternatives"`
}

// ResolveSkill is a skill specifier for the resolve endpoint.
type ResolveSkill struct {
	Name  string `json:"name"`
	Range string `json:"range"`
}

// ResolvedSkill is a resolved skill from POST /resolve.
type ResolvedSkill struct {
	Name              string   `json:"name"`
	Version           string   `json:"version"`
	ChecksumSHA256    string   `json:"checksum_sha256"`
	DownloadURL       string   `json:"download_url"`
	SigstoreBundleURL string   `json:"sigstore_bundle_url,omitempty"`
	SizeBytes         int      `json:"size_bytes"`
	TrustTier         string   `json:"trust_tier"`
	Signed            bool     `json:"signed"`
	ScanStatus        string   `json:"scan_status"`
	Dependencies      []string `json:"dependencies"`
}

// UnresolvedSkill is a skill that could not be resolved.
type UnresolvedSkill struct {
	Name       string `json:"name"`
	Range      string `json:"range"`
	Error      string `json:"error"`
	Suggestion string `json:"suggestion,omitempty"`
}

// ResolveResponse is the response from POST /resolve.
type ResolveResponse struct {
	Resolved   []ResolvedSkill   `json:"resolved"`
	Unresolved []UnresolvedSkill `json:"unresolved"`
}

// WhoamiUser is the user info from GET /auth/whoami.
type WhoamiUser struct {
	ID              string `json:"id"`
	Username        string `json:"username"`
	GithubLogin     string `json:"github_login"`
	Email           string `json:"email"`
	TrustTier       string `json:"trust_tier"`
	Role            string `json:"role"`
	SkillsPublished int    `json:"skills_published"`
	TotalDownloads  int    `json:"total_downloads"`
	CreatedAt       string `json:"created_at"`
}

// CollaboratorAction represents an action on collaborators.
type CollaboratorAction struct {
	Username string `json:"username"`
	Role     string `json:"role,omitempty"`
}

// Collaborator represents a skill collaborator.
type Collaborator struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	AddedAt  string `json:"added_at"`
}

// --- API methods ---

// Search searches for skills.
func (c *Client) Search(params SearchParams) (*SearchResponse, error) {
	q := url.Values{}
	if params.Query != "" {
		q.Set("q", params.Query)
	}
	if params.Category != "" {
		q.Set("category", params.Category)
	}
	if params.Trust != "" {
		q.Set("trust", params.Trust)
	}
	if params.Platform != "" {
		q.Set("platform", params.Platform)
	}
	if params.Sort != "" {
		q.Set("sort", params.Sort)
	}
	if params.Page > 0 {
		q.Set("page", strconv.Itoa(params.Page))
	}
	if params.PerPage > 0 {
		q.Set("per_page", strconv.Itoa(params.PerPage))
	}

	var resp SearchResponse
	if err := c.get("/skills?"+q.Encode(), &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Info gets full metadata for a skill.
func (c *Client) Info(name string) (*SkillInfo, error) {
	var resp SkillInfo
	if err := c.get("/skills/"+url.PathEscape(name), &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// GetVersion gets metadata for a specific version.
func (c *Client) GetVersion(name, version string) (*VersionInfo, error) {
	var resp VersionInfo
	path := fmt.Sprintf("/skills/%s/%s", url.PathEscape(name), url.PathEscape(version))
	if err := c.get(path, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// DownloadURL returns the download redirect URL for a skill version.
// The caller should follow the redirect to download the .skl file.
func (c *Client) DownloadURL(name, version string) (string, error) {
	path := fmt.Sprintf("/skills/%s/%s/download", url.PathEscape(name), url.PathEscape(version))
	reqURL := c.BaseURL + apiBasePath + path

	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}
	c.setAuthHeader(req)

	// Don't follow redirects — we want the Location header
	client := &http.Client{
		Timeout: c.HTTPClient.Timeout,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusFound || resp.StatusCode == http.StatusTemporaryRedirect {
		return resp.Header.Get("Location"), nil
	}

	body, _ := io.ReadAll(resp.Body)
	return "", mapStatusToError(resp.StatusCode, body)
}

// Publish publishes a skill package (multipart upload).
func (c *Client) Publish(manifestJSON []byte, sklData io.Reader, sklFilename string, sigstoreBundle []byte) (*PublishResponse, error) {
	var body bytes.Buffer
	w := multipart.NewWriter(&body)

	// Add manifest field
	if err := w.WriteField("manifest", string(manifestJSON)); err != nil {
		return nil, fmt.Errorf("writing manifest field: %w", err)
	}

	// Add package file
	fw, err := w.CreateFormFile("package", sklFilename)
	if err != nil {
		return nil, fmt.Errorf("creating package form file: %w", err)
	}
	if _, err := io.Copy(fw, sklData); err != nil {
		return nil, fmt.Errorf("copying package data: %w", err)
	}

	// Add optional sigstore bundle
	if len(sigstoreBundle) > 0 {
		fw, err := w.CreateFormFile("sigstore_bundle", sklFilename+".sigstore")
		if err != nil {
			return nil, fmt.Errorf("creating sigstore form file: %w", err)
		}
		if _, err := fw.Write(sigstoreBundle); err != nil {
			return nil, fmt.Errorf("writing sigstore data: %w", err)
		}
	}

	if err := w.Close(); err != nil {
		return nil, fmt.Errorf("closing multipart writer: %w", err)
	}

	reqURL := c.BaseURL + apiBasePath + "/skills"
	req, err := http.NewRequest(http.MethodPost, reqURL, &body)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	c.setAuthHeader(req)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, mapStatusToError(resp.StatusCode, respBody)
	}

	var result PublishResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	return &result, nil
}

// Yank yanks a specific version of a skill.
func (c *Client) Yank(name, version, reason string) (*YankResponse, error) {
	path := fmt.Sprintf("/skills/%s/%s", url.PathEscape(name), url.PathEscape(version))
	payload := map[string]string{"reason": reason}
	var resp YankResponse
	if err := c.doJSON(http.MethodDelete, path, payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Deprecate deprecates or un-deprecates a skill.
func (c *Client) Deprecate(name string, deprecated bool, msg string) (*DeprecateResponse, error) {
	path := "/skills/" + url.PathEscape(name)
	payload := map[string]any{
		"deprecated":     deprecated,
		"deprecated_msg": msg,
	}
	var resp DeprecateResponse
	if err := c.doJSON(http.MethodPatch, path, payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Report reports a skill.
func (c *Client) Report(name, reason, priority string) (*ReportResponse, error) {
	path := fmt.Sprintf("/skills/%s/report", url.PathEscape(name))
	payload := map[string]string{
		"reason":   reason,
		"priority": priority,
	}
	var resp ReportResponse
	if err := c.doJSON(http.MethodPost, path, payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// GetCollaborators lists collaborators for a skill.
func (c *Client) GetCollaborators(name string) ([]Collaborator, error) {
	var resp []Collaborator
	path := fmt.Sprintf("/skills/%s/collaborators", url.PathEscape(name))
	if err := c.get(path, &resp); err != nil {
		return nil, err
	}
	return resp, nil
}

// AddCollaborator adds a collaborator to a skill.
func (c *Client) AddCollaborator(name, username, role string) error {
	path := fmt.Sprintf("/skills/%s/collaborators", url.PathEscape(name))
	payload := CollaboratorAction{Username: username, Role: role}
	return c.doJSON(http.MethodPost, path, payload, nil)
}

// RemoveCollaborator removes a collaborator from a skill.
func (c *Client) RemoveCollaborator(name, username string) error {
	path := fmt.Sprintf("/skills/%s/collaborators/%s", url.PathEscape(name), url.PathEscape(username))
	return c.doJSON(http.MethodDelete, path, nil, nil)
}

// Classify gets a category suggestion for a skill.
func (c *Client) Classify(skillMDContent, manifestCategory string) (*ClassifyResponse, error) {
	payload := map[string]string{
		"skill_md_content":  skillMDContent,
		"manifest_category": manifestCategory,
	}
	var resp ClassifyResponse
	if err := c.doJSON(http.MethodPost, "/categories/classify", payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Resolve resolves skill specifiers to exact versions and download URLs.
func (c *Client) Resolve(skills []ResolveSkill, platform string) (*ResolveResponse, error) {
	payload := map[string]any{
		"skills":   skills,
		"platform": platform,
	}
	var resp ResolveResponse
	if err := c.doJSON(http.MethodPost, "/resolve", payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// VerifySignature verifies a skill's signature via the API.
func (c *Client) VerifySignature(name, version string) (map[string]any, error) {
	path := fmt.Sprintf("/skills/%s/%s/verify-signature", url.PathEscape(name), url.PathEscape(version))
	var resp map[string]any
	if err := c.get(path, &resp); err != nil {
		return nil, err
	}
	return resp, nil
}

// Rescan triggers a re-scan of a skill version.
func (c *Client) Rescan(name, version string) (map[string]any, error) {
	path := fmt.Sprintf("/skills/%s/%s/rescan", url.PathEscape(name), url.PathEscape(version))
	var resp map[string]any
	if err := c.doJSON(http.MethodPost, path, nil, &resp); err != nil {
		return nil, err
	}
	return resp, nil
}

// Whoami gets the current authenticated user.
func (c *Client) Whoami() (*WhoamiUser, error) {
	var resp WhoamiUser
	if err := c.get("/auth/whoami", &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Logout revokes the current token on the server.
func (c *Client) Logout() error {
	return c.doJSON(http.MethodPost, "/auth/logout", nil, nil)
}

// --- Internal HTTP helpers ---

func (c *Client) setAuthHeader(req *http.Request) {
	if c.Token != "" {
		req.Header.Set("Authorization", "Bearer "+c.Token)
	}
}

func (c *Client) get(path string, result any) error {
	reqURL := c.BaseURL + apiBasePath + path
	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	c.setAuthHeader(req)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return mapStatusToError(resp.StatusCode, body)
	}

	if result != nil && len(body) > 0 {
		if err := json.Unmarshal(body, result); err != nil {
			return fmt.Errorf("decoding response: %w", err)
		}
	}

	return nil
}

func (c *Client) doJSON(method, path string, payload any, result any) error {
	reqURL := c.BaseURL + apiBasePath + path

	var bodyReader io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("encoding request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequest(method, reqURL, bodyReader)
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	c.setAuthHeader(req)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading response: %w", err)
	}

	// 204 No Content is success with no body
	if resp.StatusCode == http.StatusNoContent {
		return nil
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return mapStatusToError(resp.StatusCode, body)
	}

	if result != nil && len(body) > 0 {
		if err := json.Unmarshal(body, result); err != nil {
			return fmt.Errorf("decoding response: %w", err)
		}
	}

	return nil
}
