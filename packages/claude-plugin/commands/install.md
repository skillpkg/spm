---
name: install
description: Install an AI agent skill from the SPM registry
argument: name
---

Install a skill from the SPM registry.

1. First, use the `get_skill` MCP tool from the `skillpkg` server with the name "$ARGUMENTS" to verify the skill exists and show its details to the user.

2. Ask the user for confirmation before proceeding.

3. To install:
   - If the `spm` CLI is available, run: `spm install $ARGUMENTS`
   - If `spm` is not available, suggest installing it first:

     ```bash
     # Via npm
     npm install -g @skillpkg/cli

     # Via Homebrew
     brew install skillpkg/tap/spm

     # Via curl
     curl -fsSL https://skillpkg.dev/install.sh | sh
     ```

   - Then run: `spm install $ARGUMENTS`

4. After installation, let the user know the skill is ready to use.

If no name is provided, ask the user which skill they want to install, or suggest using `/skillpkg:search` to find skills.
