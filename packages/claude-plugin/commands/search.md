---
name: search
description: Search the SPM registry for AI agent skills
argument: query
---

Search the SPM skill registry for skills matching the user's query.

Use the `search_skills` MCP tool from the `skillpkg` server with the query "$ARGUMENTS".

Present results in a readable format:

- Show skill name, version, author, rating, and download count
- Include a brief description for each skill
- Show install commands: `spm install <name>`
- If no results, suggest broadening the search or trying related terms

If no query is provided, ask the user what kind of skill they're looking for.
