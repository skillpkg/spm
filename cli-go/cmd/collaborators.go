package cmd

import (
	"fmt"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var collaboratorsCmd = &cobra.Command{
	Use:     "collaborators",
	Aliases: []string{"collab"},
	Short:   "Manage skill collaborators",
	Long:    "List, add, or remove collaborators for a skill.",
}

var collabListCmd = &cobra.Command{
	Use:   "list <skill-name>",
	Short: "List collaborators for a skill",
	Args:  cobra.ExactArgs(1),
	RunE:  runCollabList,
}

var collabAddCmd = &cobra.Command{
	Use:   "add <skill-name> <username>",
	Short: "Add a collaborator to a skill",
	Args:  cobra.ExactArgs(2),
	RunE:  runCollabAdd,
}

var collabRemoveCmd = &cobra.Command{
	Use:   "remove <skill-name> <username>",
	Short: "Remove a collaborator from a skill",
	Args:  cobra.ExactArgs(2),
	RunE:  runCollabRemove,
}

var collabRole string

func init() {
	collabAddCmd.Flags().StringVar(&collabRole, "role", "maintainer", "Collaborator role (maintainer)")
	collaboratorsCmd.AddCommand(collabListCmd)
	collaboratorsCmd.AddCommand(collabAddCmd)
	collaboratorsCmd.AddCommand(collabRemoveCmd)
	rootCmd.AddCommand(collaboratorsCmd)
}

func newAPIClient() *api.Client {
	return api.NewClient(Cfg.RegistryURL(), Cfg.Token)
}

func runCollabList(_ *cobra.Command, args []string) error {
	skillName := args[0]
	client := newAPIClient()

	sp := Out.StartSpinner("Fetching collaborators...")
	collabs, err := client.GetCollaborators(skillName)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("fetching collaborators: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"skill":         skillName,
			"collaborators": collabs,
			"count":         len(collabs),
		})
	}

	Out.Log("")
	Out.Log("  %s Collaborators for %s", output.Icons["info"], output.Cyan(skillName))
	Out.Log("")

	if len(collabs) == 0 {
		Out.Log("  %s", output.Dim("No collaborators found."))
	} else {
		nameCol := padRight("USERNAME", 25)
		roleCol := padRight("ROLE", 15)
		addedCol := "ADDED"
		Out.Log("  %s%s%s", output.Bold(nameCol), output.Bold(roleCol), output.Bold(addedCol))

		for _, c := range collabs {
			Out.Log("  %s%s%s",
				padRight(c.Username, 25),
				padRight(c.Role, 15),
				output.Dim(c.AddedAt),
			)
		}
	}

	Out.Log("")
	return nil
}

func runCollabAdd(_ *cobra.Command, args []string) error {
	skillName := args[0]
	username := args[1]

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Adding %s to %s...", username, skillName))
	err := client.AddCollaborator(skillName, username, collabRole)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("adding collaborator: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"skill":    skillName,
			"username": username,
			"role":     collabRole,
			"action":   "added",
		})
	}

	Out.Log("")
	Out.Log("  %s Added %s as %s to %s", output.Icons["success"], output.Cyan(username), collabRole, output.Cyan(skillName))
	Out.Log("")

	return nil
}

func runCollabRemove(_ *cobra.Command, args []string) error {
	skillName := args[0]
	username := args[1]

	if Cfg.Token == "" {
		return fmt.Errorf("authentication required: run 'spm login' first")
	}

	client := newAPIClient()

	sp := Out.StartSpinner(fmt.Sprintf("Removing %s from %s...", username, skillName))
	err := client.RemoveCollaborator(skillName, username)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("removing collaborator: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(map[string]any{
			"skill":    skillName,
			"username": username,
			"action":   "removed",
		})
	}

	Out.Log("")
	Out.Log("  %s Removed %s from %s", output.Icons["success"], output.Cyan(username), output.Cyan(skillName))
	Out.Log("")

	return nil
}
