package api

import (
	"fmt"
	"net/http"
)

// Error codes returned by the SPM registry API.
const (
	ErrCodeUnauthorized    = "unauthorized"
	ErrCodeForbidden       = "forbidden"
	ErrCodeSkillNotFound   = "skill_not_found"
	ErrCodeVersionNotFound = "version_not_found"
	ErrCodeVersionExists   = "version_exists"
	ErrCodeValidation      = "validation_error"
	ErrCodePublishBlocked  = "publish_blocked"
	ErrCodeRateLimited     = "rate_limited"
	ErrCodeInternal        = "internal_error"
)

// APIError represents an error response from the SPM registry API.
type APIError struct {
	// StatusCode is the HTTP status code.
	StatusCode int `json:"-"`
	// Code is the machine-readable error code.
	Code string `json:"error"`
	// Message is the human-readable error description.
	Message string `json:"message"`
	// Suggestion is an optional fix suggestion.
	Suggestion string `json:"suggestion,omitempty"`
	// Details contains optional extra error details.
	Details map[string]any `json:"details,omitempty"`
}

// Error implements the error interface.
func (e *APIError) Error() string {
	if e.Suggestion != "" {
		return fmt.Sprintf("API error %d (%s): %s (suggestion: %s)", e.StatusCode, e.Code, e.Message, e.Suggestion)
	}
	return fmt.Sprintf("API error %d (%s): %s", e.StatusCode, e.Code, e.Message)
}

// IsUnauthorized returns true if the error is a 401 Unauthorized.
func (e *APIError) IsUnauthorized() bool {
	return e.StatusCode == http.StatusUnauthorized
}

// IsNotFound returns true if the error is a 404 Not Found.
func (e *APIError) IsNotFound() bool {
	return e.StatusCode == http.StatusNotFound
}

// IsConflict returns true if the error is a 409 Conflict.
func (e *APIError) IsConflict() bool {
	return e.StatusCode == http.StatusConflict
}

// IsValidation returns true if the error is a 422 Unprocessable Entity.
func (e *APIError) IsValidation() bool {
	return e.StatusCode == http.StatusUnprocessableEntity
}

// IsRateLimited returns true if the error is a 429 Too Many Requests.
func (e *APIError) IsRateLimited() bool {
	return e.StatusCode == http.StatusTooManyRequests
}

// IsServerError returns true if the error is a 5xx Server Error.
func (e *APIError) IsServerError() bool {
	return e.StatusCode >= 500
}

// mapStatusToError converts an HTTP status code and response body to a typed APIError.
// If the body contains a valid error JSON, those fields are used; otherwise defaults are applied.
func mapStatusToError(statusCode int, body []byte) *APIError {
	apiErr := &APIError{StatusCode: statusCode}

	// Try to parse JSON error body
	if len(body) > 0 {
		// We do a manual parse to handle the JSON error body
		type errResp struct {
			Error      string         `json:"error"`
			Message    string         `json:"message"`
			Suggestion string         `json:"suggestion"`
			Details    map[string]any `json:"details"`
		}
		var resp errResp
		if err := jsonUnmarshal(body, &resp); err == nil {
			apiErr.Code = resp.Error
			apiErr.Message = resp.Message
			apiErr.Suggestion = resp.Suggestion
			apiErr.Details = resp.Details
		}
	}

	// Apply defaults if not parsed from body
	if apiErr.Code == "" {
		switch statusCode {
		case http.StatusBadRequest:
			apiErr.Code = ErrCodeValidation
			apiErr.Message = "Bad request"
		case http.StatusUnauthorized:
			apiErr.Code = ErrCodeUnauthorized
			apiErr.Message = "Missing or invalid authentication token"
		case http.StatusForbidden:
			apiErr.Code = ErrCodeForbidden
			apiErr.Message = "Insufficient permissions"
		case http.StatusNotFound:
			apiErr.Code = ErrCodeSkillNotFound
			apiErr.Message = "Resource not found"
		case http.StatusConflict:
			apiErr.Code = ErrCodeVersionExists
			apiErr.Message = "Resource already exists"
		case http.StatusUnprocessableEntity:
			apiErr.Code = ErrCodeValidation
			apiErr.Message = "Validation error"
		case http.StatusTooManyRequests:
			apiErr.Code = ErrCodeRateLimited
			apiErr.Message = "Too many requests"
		default:
			apiErr.Code = ErrCodeInternal
			apiErr.Message = fmt.Sprintf("Server error (HTTP %d)", statusCode)
		}
	}

	return apiErr
}
