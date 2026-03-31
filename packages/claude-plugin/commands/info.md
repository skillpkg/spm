---
name: info
description: Get detailed information about a specific SPM skill
argument: name
---

Get detailed information about a specific skill from the SPM registry.

Use the `get_skill` MCP tool from the `skillpkg` server with the name "$ARGUMENTS".

Present the full skill details:

- Name, version, and author (with verification status)
- Description
- Categories and tags
- License
- Download count and rating
- Platforms supported
- Install command: `spm install <name>`

If no name is provided, ask the user which skill they want to know about.
