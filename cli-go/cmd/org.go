package cmd

import (
	"fmt"
	"strings"

	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var orgCmd = &cobra.Command{
	Use:   "org",
	Short: "Manage organizations",
	Long:  "Create, list, and manage organizations and their members.",
}

var orgCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "Create a new organization",
	Args:  cobra.ExactArgs(1),
	RunE:  runOrgCreate,
}

var orgListCmd = &cobra.Command{
	Use:   "list",
	Short: "List your organizations",
	RunE:  runOrgList,
}

var orgInfoCmd = &cobra.Command{
	Use:   "info <name>",
	Short: "Show organization details",
	Args:  cobra.ExactArgs(1),
	RunE:  runOrgInfo,
}

var orgInviteCmd = &cobra.Command{
	Use:   "invite <org> <username>",
	Short: "Add a member to an organization",
	Args:  cobra.ExactArgs(2),
	RunE:  runOrgInvite,
}

var orgMembersCmd = &cobra.Command{
	Use:   "members <name>",
	Short: "List organization members",
	Args:  cobra.ExactArgs(1),
	RunE:  runOrgMembers,
}

var orgRoleCmd = &cobra.Command{
	Use:   "role <org> <username> <role>",
	Short: "Change a member's role",
	Args:  cobra.ExactArgs(3),
	RunE:  runOrgRole,
}

var orgRemoveCmd = &cobra.Command{
	Use:   "remove <org> <username>",
	Short: "Remove a member from an organization",
	Args:  cobra.ExactArgs(2),
	RunE:  runOrgRemove,
}

var orgLeaveCmd = &cobra.Command{
	Use:   "leave <name>",
	Short: "Leave an organization",
	Args:  cobra.ExactArgs(1),
	RunE:  runOrgLeave,
}

var (
	orgDisplayName string
	orgDescription string
	orgInviteRole  string
)

func init() {
	orgCreateCmd.Flags().StringVar(&orgDisplayName, "display-name", "", "Display name for the organization")
	orgCreateCmd.Flags().StringVar(&orgDescription, "description", "", "Description for the organization")
	orgInviteCmd.Flags().StringVar(&orgInviteRole, "role", "member", "Role for the invited member (owner, admin, member)")

	orgCmd.AddCommand(orgCreateCmd)
	orgCmd.AddCommand(orgListCmd)
	orgCmd.AddCommand(orgInfoCmd)
	orgCmd.AddCommand(orgInviteCmd)
	orgCmd.AddCommand(orgMembersCmd)
	orgCmd.AddCommand(orgRoleCmd)
	orgCmd.AddCommand(orgRemoveCmd)
	orgCmd.AddCommand(orgLeaveCmd)
	rootCmd.AddCommand(orgCmd)
}

func runOrgCreate(_ *cobra.Command, args []string) error {
	name := args[0]

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Creating organization %s...", name))
	org, err := client.CreateOrg(name, orgDisplayName, orgDescription)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("creating organization: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(org)
	}

	Out.Log("")
	Out.Log("  %s Created organization %s", output.Icons["success"], output.Cyan("@"+org.Name))
	if org.DisplayName != "" {
		Out.Log("  %s", output.Dim(org.DisplayName))
	}
	Out.Log("  You are the owner.")
	Out.Log("")

	return nil
}

func runOrgList(_ *cobra.Command, _ []string) error {
	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	// Get current username via whoami
	sp := Out.StartSpinner("Fetching your organizations...")
	user, err := client.Whoami()
	if err != nil {
		output.StopSpinner(sp)
		return fmt.Errorf("fetching user info: %w", err)
	}

	orgs, err := client.ListMyOrgs(user.Username)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("listing organizations: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"username": user.Username,
			"orgs":     orgs,
			"count":    len(orgs),
		})
	}

	Out.Log("")
	Out.Log("  %s Organizations for %s", output.Icons["info"], output.Cyan("@"+user.Username))
	Out.Log("")

	if len(orgs) == 0 {
		Out.Log("  %s", output.Dim("You are not a member of any organizations."))
		Out.Log("")
		Out.Log("  Create one with: %s", output.Cyan("spm org create <name>"))
	} else {
		nameCol := padRight("ORGANIZATION", 25)
		roleCol := padRight("ROLE", 12)
		descCol := "DISPLAY NAME"
		Out.Log("  %s%s%s", output.Bold(nameCol), output.Bold(roleCol), output.Bold(descCol))

		for _, o := range orgs {
			displayName := o.DisplayName
			if displayName == "" {
				displayName = output.Dim("—")
			}
			Out.Log("  %s%s%s",
				padRight("@"+o.Name, 25),
				padRight(o.Role, 12),
				displayName,
			)
		}
	}

	Out.Log("")
	return nil
}

func runOrgInfo(_ *cobra.Command, args []string) error {
	name := strings.TrimPrefix(args[0], "@")
	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Fetching info for @%s...", name))
	org, err := client.GetOrg(name)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("fetching organization: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(org)
	}

	Out.Log("")
	title := "@" + org.Name
	if org.DisplayName != "" {
		title += " — " + org.DisplayName
	}
	Out.Log("  %s %s", output.Icons["info"], output.Bold(title))

	if org.Description != "" {
		Out.Log("  %s", output.Dim(org.Description))
	}
	Out.Log("")
	Out.Log("  Members: %s", output.Cyan(fmt.Sprintf("%d", org.MemberCount)))
	Out.Log("  Skills:  %s published", output.Cyan(fmt.Sprintf("%d", org.SkillCount)))

	if org.Website != "" {
		Out.Log("  Website: %s", output.Cyan(org.Website))
	}

	Out.Log("")
	return nil
}

func runOrgInvite(_ *cobra.Command, args []string) error {
	orgName := strings.TrimPrefix(args[0], "@")
	username := strings.TrimPrefix(args[1], "@")

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Inviting %s to @%s...", username, orgName))
	err := client.AddOrgMember(orgName, username, orgInviteRole)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("inviting member: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"org":      orgName,
			"username": username,
			"role":     orgInviteRole,
			"action":   "invited",
		})
	}

	Out.Log("")
	Out.Log("  %s Invited %s to %s as %s", output.Icons["success"],
		output.Cyan("@"+username), output.Cyan("@"+orgName), orgInviteRole)
	Out.Log("")

	return nil
}

func runOrgMembers(_ *cobra.Command, args []string) error {
	name := strings.TrimPrefix(args[0], "@")
	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Fetching members of @%s...", name))
	members, err := client.ListOrgMembers(name)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("fetching members: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"org":     name,
			"members": members,
			"count":   len(members),
		})
	}

	Out.Log("")
	Out.Log("  %s Members of %s", output.Icons["info"], output.Cyan("@"+name))
	Out.Log("")

	if len(members) == 0 {
		Out.Log("  %s", output.Dim("No members found."))
	} else {
		nameCol := padRight("USERNAME", 25)
		roleCol := padRight("ROLE", 12)
		joinedCol := "JOINED"
		Out.Log("  %s%s%s", output.Bold(nameCol), output.Bold(roleCol), output.Bold(joinedCol))

		for _, m := range members {
			Out.Log("  %s%s%s",
				padRight("@"+m.Username, 25),
				padRight(m.Role, 12),
				output.Dim(m.JoinedAt),
			)
		}
	}

	Out.Log("")
	return nil
}

func runOrgRole(_ *cobra.Command, args []string) error {
	orgName := strings.TrimPrefix(args[0], "@")
	username := strings.TrimPrefix(args[1], "@")
	role := args[2]

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Changing %s's role in @%s...", username, orgName))
	err := client.ChangeOrgRole(orgName, username, role)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("changing role: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"org":      orgName,
			"username": username,
			"role":     role,
			"action":   "role_changed",
		})
	}

	Out.Log("")
	Out.Log("  %s Changed %s role to %s in %s", output.Icons["success"],
		output.Cyan("@"+username), role, output.Cyan("@"+orgName))
	Out.Log("")

	return nil
}

func runOrgRemove(_ *cobra.Command, args []string) error {
	orgName := strings.TrimPrefix(args[0], "@")
	username := strings.TrimPrefix(args[1], "@")

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Removing %s from @%s...", username, orgName))
	err := client.RemoveOrgMember(orgName, username)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("removing member: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"org":      orgName,
			"username": username,
			"action":   "removed",
		})
	}

	Out.Log("")
	Out.Log("  %s Removed %s from %s", output.Icons["success"],
		output.Cyan("@"+username), output.Cyan("@"+orgName))
	Out.Log("")

	return nil
}

func runOrgLeave(_ *cobra.Command, args []string) error {
	orgName := strings.TrimPrefix(args[0], "@")

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	// Get current username via whoami
	sp := Out.StartSpinner("Fetching user info...")
	user, err := client.Whoami()
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("fetching user info: %w", err)
	}

	sp = Out.StartSpinner(fmt.Sprintf("Leaving @%s...", orgName))
	err = client.RemoveOrgMember(orgName, user.Username)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("leaving organization: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"org":    orgName,
			"action": "left",
		})
	}

	Out.Log("")
	Out.Log("  %s Left %s", output.Icons["success"], output.Cyan("@"+orgName))
	Out.Log("")

	return nil
}
