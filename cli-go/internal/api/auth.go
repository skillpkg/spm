package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// DeviceCodeResponse is the response from POST /auth/device-code.
type DeviceCodeResponse struct {
	DeviceCode      string `json:"device_code"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int    `json:"expires_in"`
	Interval        int    `json:"interval"`
}

// TokenUser is the user info returned with a token.
type TokenUser struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	GithubLogin string `json:"github_login"`
	TrustTier   string `json:"trust_tier"`
	CreatedAt   string `json:"created_at"`
}

// TokenResponse is the response from POST /auth/token when authorization is complete.
type TokenResponse struct {
	Token string    `json:"token"`
	User  TokenUser `json:"user"`
}

// PollStatus represents the status of a device code poll.
type PollStatus string

const (
	PollPending  PollStatus = "authorization_pending"
	PollSlowDown PollStatus = "slow_down"
	PollExpired  PollStatus = "expired_token"
	PollDenied   PollStatus = "access_denied"
)

// PollResult is the result of polling for a device token.
// Either Token is set (success) or Status is set (pending/error).
type PollResult struct {
	// Token is set when authorization is complete.
	Token *TokenResponse
	// Status is set when still pending or on error.
	Status PollStatus
}

// DeviceCode initiates the GitHub OAuth device flow.
func (c *Client) DeviceCode() (*DeviceCodeResponse, error) {
	var resp DeviceCodeResponse
	if err := c.doJSON(http.MethodPost, "/auth/device-code", map[string]string{}, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// PollToken polls for a token after the user has been sent to GitHub.
// Returns a PollResult indicating success, pending, or error state.
func (c *Client) PollToken(deviceCode string) (*PollResult, error) {
	payload := map[string]string{
		"device_code": deviceCode,
		"grant_type":  "urn:ietf:params:oauth:grant-type:device_code",
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encoding request: %w", err)
	}

	reqURL := c.BaseURL + apiBasePath + "/auth/token"
	req, err := http.NewRequest(http.MethodPost, reqURL, bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	// 200 = authorized
	if resp.StatusCode == http.StatusOK {
		var tokenResp TokenResponse
		if err := json.Unmarshal(body, &tokenResp); err != nil {
			return nil, fmt.Errorf("decoding token response: %w", err)
		}
		return &PollResult{Token: &tokenResp}, nil
	}

	// 428 = authorization_pending or slow_down
	if resp.StatusCode == 428 {
		var errResp struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(body, &errResp); err == nil {
			if errResp.Error == string(PollSlowDown) {
				return &PollResult{Status: PollSlowDown}, nil
			}
		}
		return &PollResult{Status: PollPending}, nil
	}

	// 410 = expired
	if resp.StatusCode == http.StatusGone {
		return &PollResult{Status: PollExpired}, nil
	}

	// Other errors
	return nil, mapStatusToError(resp.StatusCode, body)
}

// DeviceFlowConfig holds configuration for the device flow polling loop.
type DeviceFlowConfig struct {
	// PollInterval is the initial poll interval. Increases on slow_down.
	PollInterval time.Duration
	// ExpiresIn is the deadline for the device code.
	ExpiresIn time.Duration
	// Sleep is the function used to pause between polls.
	// Defaults to time.Sleep if nil.
	Sleep func(time.Duration)
}

// PollDeviceFlow runs the device flow polling loop until success, expiry, or denial.
// It handles slow_down by increasing the interval.
func (c *Client) PollDeviceFlow(deviceCode string, cfg DeviceFlowConfig) (*TokenResponse, error) {
	sleepFn := cfg.Sleep
	if sleepFn == nil {
		sleepFn = time.Sleep
	}

	interval := cfg.PollInterval
	deadline := time.Now().Add(cfg.ExpiresIn)

	for time.Now().Before(deadline) {
		sleepFn(interval)

		result, err := c.PollToken(deviceCode)
		if err != nil {
			// Network errors during poll — keep trying
			continue
		}

		if result.Token != nil {
			return result.Token, nil
		}

		switch result.Status {
		case PollSlowDown:
			interval += 5 * time.Second
		case PollExpired:
			return nil, fmt.Errorf("device code expired")
		case PollDenied:
			return nil, fmt.Errorf("access denied by user")
		case PollPending:
			// Keep polling
		}
	}

	return nil, fmt.Errorf("device code expired")
}
