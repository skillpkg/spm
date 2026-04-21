package cmd

import (
	"fmt"
	"strings"

	"github.com/skillpkg/spm/internal/api"
	"github.com/skillpkg/spm/internal/output"
	"github.com/spf13/cobra"
)

var (
	searchCategory  string
	searchTrustTier string
	searchSort      string
	searchLimit     int
	searchOffset    int
)

var searchCmd = &cobra.Command{
	Use:   "search <query>",
	Short: "Search for skills in the registry",
	Long:  "Search the SPM registry for skills matching a query. Supports filtering by category, trust tier, and sorting.",
	Args:  cobra.ExactArgs(1),
	RunE:  runSearch,
}

func init() {
	searchCmd.Flags().StringVar(&searchCategory, "category", "", "Filter by category slug")
	searchCmd.Flags().StringVar(&searchTrustTier, "trust-tier", "", "Filter by minimum trust tier")
	searchCmd.Flags().StringVar(&searchSort, "sort", "relevance", "Sort by: relevance, downloads, rating, updated, new")
	searchCmd.Flags().IntVar(&searchLimit, "limit", 20, "Results per page")
	searchCmd.Flags().IntVar(&searchOffset, "offset", 0, "Page offset (page number)")
	rootCmd.AddCommand(searchCmd)
}

func formatDownloads(n int) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	if n < 1000000 {
		return fmt.Sprintf("%.1fk", float64(n)/1000)
	}
	return fmt.Sprintf("%.1fM", float64(n)/1000000)
}

func trustBadge(tier string) string {
	switch strings.ToLower(tier) {
	case "verified":
		return output.Green("V verified")
	case "trusted":
		return output.Cyan("T trusted")
	case "registered":
		return output.Dim("R registered")
	default:
		return output.Dim(tier)
	}
}

func runSearch(_ *cobra.Command, args []string) error {
	query := args[0]

	client := api.NewClient(Cfg.RegistryURL(), Cfg.Token)

	params := api.SearchParams{
		Query:    query,
		Category: searchCategory,
		Trust:    searchTrustTier,
		Sort:     searchSort,
		PerPage:  searchLimit,
	}
	if searchOffset > 0 {
		params.Page = searchOffset
	}

	sp := Out.StartSpinner("Searching registry...")
	resp, err := client.Search(params)
	output.StopSpinner(sp)
	if err != nil {
		return fmt.Errorf("search failed: %w", err)
	}

	if Out.Mode == output.ModeJSON {
		return Out.LogJSON(resp)
	}

	if len(resp.Results) == 0 {
		Out.Log("")
		Out.Log("  %s No skills found for %q", output.Icons["info"], query)
		Out.Log("")
		if searchCategory != "" || searchTrustTier != "" {
			Out.Log("  %s", output.Dim("Try removing some filters to broaden your search."))
		} else {
			Out.Log("  %s", output.Dim("Try different keywords or browse categories with: spm search --category <slug>"))
		}
		Out.Log("")
		return nil
	}

	Out.Log("")

	// Table header
	nameCol := padRight("NAME", 25)
	verCol := padRight("VERSION", 12)
	descCol := padRight("DESCRIPTION", 40)
	dlCol := padRight("DOWNLOADS", 12)
	trustCol := "TRUST"
	Out.Log("  %s%s%s%s%s", output.Bold(nameCol), output.Bold(verCol), output.Bold(descCol), output.Bold(dlCol), output.Bold(trustCol))

	for _, skill := range resp.Results {
		name := padRight(skill.Name, 25)
		ver := padRight(skill.Version, 12)
		desc := skill.Description
		if len(desc) > 38 {
			desc = desc[:35] + "..."
		}
		desc = padRight(desc, 40)
		dl := padRight(formatDownloads(skill.Downloads), 12)
		trust := trustBadge(skill.Author.TrustTier)

		nameDisplay := output.Cyan(name)
		if skill.Visibility == "private" {
			nameDisplay += output.Yellow(" (private)")
		}

		Out.Log("  %s%s%s%s%s", nameDisplay, ver, desc, dl, trust)
	}

	Out.Log("")
	Out.Log("  %d result%s found", resp.Total, pluralS(resp.Total))
	Out.Log("  Install: %s", output.Cyan("spm install <name>"))
	Out.Log("")

	return nil
}

func padRight(s string, n int) string {
	if len(s) >= n {
		return s
	}
	return s + strings.Repeat(" ", n-len(s))
}

func pluralS(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}
