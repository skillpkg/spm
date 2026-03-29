#!/bin/sh
# SPM installer — curl -fsSL https://skillpkg.dev/install.sh | sh
set -e

REPO="skillpkg/spm"
BINARY="spm"

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)  echo "linux" ;;
        Darwin*) echo "darwin" ;;
        *)
            echo "Error: unsupported operating system: $(uname -s)" >&2
            echo "SPM supports Linux and macOS." >&2
            exit 1
            ;;
    esac
}

# Detect architecture
detect_arch() {
    case "$(uname -m)" in
        x86_64|amd64)  echo "amd64" ;;
        aarch64|arm64) echo "arm64" ;;
        *)
            echo "Error: unsupported architecture: $(uname -m)" >&2
            echo "SPM supports amd64 and arm64." >&2
            exit 1
            ;;
    esac
}

# Get latest release version from GitHub API
get_latest_version() {
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/'
    elif command -v wget >/dev/null 2>&1; then
        wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/'
    else
        echo "Error: curl or wget is required to download SPM." >&2
        exit 1
    fi
}

# Download a file
download() {
    url="$1"
    output="$2"
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL -o "$output" "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$output" "$url"
    fi
}

main() {
    echo "Installing SPM — Skills Package Manager for AI agents"
    echo ""

    OS="$(detect_os)"
    ARCH="$(detect_arch)"

    echo "Detected platform: ${OS}/${ARCH}"

    VERSION="$(get_latest_version)"
    if [ -z "$VERSION" ]; then
        echo "Error: could not determine latest SPM version." >&2
        exit 1
    fi

    echo "Latest version: v${VERSION}"

    ARCHIVE="${BINARY}_${VERSION}_${OS}_${ARCH}.tar.gz"
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION}/${ARCHIVE}"

    TMPDIR="$(mktemp -d)"
    trap 'rm -rf "$TMPDIR"' EXIT

    echo "Downloading ${DOWNLOAD_URL}..."
    download "$DOWNLOAD_URL" "${TMPDIR}/${ARCHIVE}"
    if [ ! -f "${TMPDIR}/${ARCHIVE}" ]; then
        echo "Error: download failed." >&2
        exit 1
    fi

    echo "Extracting..."
    tar -xzf "${TMPDIR}/${ARCHIVE}" -C "$TMPDIR"
    if [ ! -f "${TMPDIR}/${BINARY}" ]; then
        echo "Error: extraction failed — binary not found in archive." >&2
        exit 1
    fi

    chmod +x "${TMPDIR}/${BINARY}"

    # Determine install directory
    INSTALL_DIR="/usr/local/bin"
    if [ ! -d "$INSTALL_DIR" ] || [ ! -w "$INSTALL_DIR" ]; then
        INSTALL_DIR="${HOME}/.local/bin"
        mkdir -p "$INSTALL_DIR"
        echo "Note: installing to ${INSTALL_DIR} (no write access to /usr/local/bin)"
        # Check if ~/.local/bin is in PATH
        case ":$PATH:" in
            *":${INSTALL_DIR}:"*) ;;
            *)
                echo ""
                echo "WARNING: ${INSTALL_DIR} is not in your PATH."
                echo "Add it by running:"
                echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
                echo "Or add that line to your shell profile (~/.bashrc, ~/.zshrc, etc.)"
                ;;
        esac
    fi

    mv "${TMPDIR}/${BINARY}" "${INSTALL_DIR}/${BINARY}"

    echo ""
    echo "SPM v${VERSION} installed to ${INSTALL_DIR}/${BINARY}"
    echo ""

    # Verify installation
    if command -v spm >/dev/null 2>&1; then
        echo "Verification:"
        spm --version
    else
        echo "Run 'spm --version' to verify the installation."
    fi

    echo ""
    echo "Get started:"
    echo "  spm search <query>    Search for skills"
    echo "  spm install <skill>   Install a skill"
    echo "  spm --help            Show all commands"
}

main
