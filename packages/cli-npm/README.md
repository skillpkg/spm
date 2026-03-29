# @skillpkg/cli

npm wrapper for the [SPM](https://skillpkg.dev) Go binary. On `npm install`, a postinstall script downloads the correct native binary for your platform.

## Install

```bash
npm install -g @skillpkg/cli
```

Requires Node.js 18+. Supports macOS (x64, arm64), Linux (x64, arm64), and Windows (x64).

## Alternative install methods

If you don't use Node.js, install the native binary directly:

```bash
# macOS
brew install skillpkg/tap/spm

# Linux / macOS
curl -fsSL https://skillpkg.dev/install.sh | sh
```

Or download from [GitHub Releases](https://github.com/skillpkg/spm/releases).

## Usage

```bash
spm search "pdf tools"
spm install data-viz
spm agents
spm init my-skill
spm publish
```

See `spm --help` for all commands.

## Links

- [skillpkg.dev](https://skillpkg.dev)
- [GitHub](https://github.com/skillpkg/spm)
- [MCP Server](https://www.npmjs.com/package/@skillpkg/mcp)

## License

Apache-2.0
