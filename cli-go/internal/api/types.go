package api

// OrgInfo is the response from GET /orgs/:name or POST /orgs.
type OrgInfo struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	DisplayName string      `json:"display_name,omitempty"`
	Description string      `json:"description,omitempty"`
	AvatarURL   string      `json:"avatar_url,omitempty"`
	Website     string      `json:"website,omitempty"`
	MemberCount int         `json:"member_count"`
	SkillCount  int         `json:"skill_count"`
	Members     []OrgMember `json:"members,omitempty"`
	CreatedAt   string      `json:"created_at"`
}

// OrgSummary is a brief org entry from GET /users/:username/orgs.
type OrgSummary struct {
	Name        string `json:"name"`
	DisplayName string `json:"display_name,omitempty"`
	Role        string `json:"role"`
	JoinedAt    string `json:"joined_at"`
}

// OrgMember represents a member of an organization.
type OrgMember struct {
	Username string `json:"username"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}
