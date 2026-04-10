# @skillpkg/mcp

MCP server for the [SPM](https://skillpkg.dev) skills registry. Search, browse, and query AI agent skills from Claude Desktop, Claude Code, Cursor, or any MCP client.

## Tools

| Tool             | Description                                |
| ---------------- | ------------------------------------------ |
| `spm_search`     | Search skills by query and category        |
| `spm_info`       | Get detailed info about a specific skill   |
| `spm_categories` | List all skill categories with counts      |
| `spm_template`   | Get the skill template as a starting point |

## Quick Start

No installation required — use `npx` to run on demand.

### Claude Code

Add a `.mcp.json` file to your project root:

```json
{
  "mcpServers": {
    "spm": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@skillpkg/mcp"]
    }
  }
}
```

Or add it via the CLI:

```bash
claude mcp add spm -- npx -y @skillpkg/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "spm": {
      "command": "npx",
      "args": ["-y", "@skillpkg/mcp"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

> **Note:** Claude Desktop has a limited PATH. You may need to adjust the `env.PATH` to include the directory where `node` is installed. Run `dirname $(which node)` in your terminal to find it.

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "spm": {
      "command": "npx",
      "args": ["-y", "@skillpkg/mcp"]
    }
  }
}
```

### Global Install (optional)

If you prefer a global install instead of `npx`:

```bash
npm install -g @skillpkg/mcp
```

Then use `"command": "spm-mcp"` in your config instead.

## Usage

Once configured, ask your AI agent to search for skills:

- "Search for PDF skills on SPM"
- "What categories of skills are available?"
- "Get info about the frontend-design skill"
- "Show me the skill template so I can create a new skill"

### Custom Registry URL

To point to a different registry (e.g. local development):

```json
{
  "mcpServers": {
    "spm": {
      "command": "npx",
      "args": ["-y", "@skillpkg/mcp"],
      "env": {
        "SPM_REGISTRY_URL": "http://localhost:8787/api/v1"
      }
    }
  }
}
```

## Development

```bash
# Run locally
pnpm dev

# Build
pnpm build

# Test
pnpm test
```

## License

MIT
