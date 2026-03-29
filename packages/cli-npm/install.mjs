#!/usr/bin/env node
/**
 * Postinstall script: downloads the correct SPM Go binary for the current platform.
 * Falls back gracefully if download fails (e.g., behind a firewall).
 */
import { createWriteStream, readFileSync, writeFileSync, mkdirSync, rmdirSync, chmodSync, existsSync, unlinkSync, renameSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Read version from package.json (env var override for testing)
const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
const VERSION = process.env.SPM_VERSION || pkg.version;
const REPO = "skillpkg/spm";

const PLATFORM_MAP = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

const ARCH_MAP = {
  x64: "amd64",
  arm64: "arm64",
};

async function main() {
  const platform = PLATFORM_MAP[process.platform];
  const arch = ARCH_MAP[process.arch];

  if (!platform || !arch) {
    console.error(
      `SPM: unsupported platform ${process.platform}/${process.arch}. ` +
        `Install manually from https://github.com/${REPO}/releases`
    );
    process.exit(0); // Don't fail npm install
  }

  const binDir = join(__dirname, "bin");
  const binName = platform === "windows" ? "spm-go.exe" : "spm-go";
  const binPath = join(binDir, binName);

  // Skip if binary already exists (e.g., re-running postinstall)
  if (existsSync(binPath)) {
    return;
  }

  const ext = platform === "windows" ? "zip" : "tar.gz";
  const archive = `spm_${VERSION}_${platform}_${arch}.${ext}`;
  const url = `https://github.com/${REPO}/releases/download/v${VERSION}/${archive}`;

  console.log(`SPM: downloading v${VERSION} for ${platform}/${arch}...`);

  try {
    mkdirSync(binDir, { recursive: true });

    if (ext === "tar.gz") {
      await downloadAndExtractTarGz(url, binDir, binName);
    } else {
      await downloadAndExtractZip(url, binDir, binName);
    }

    chmodSync(binPath, 0o755);
    console.log(`SPM: installed to ${binPath}`);
  } catch (err) {
    console.error(`SPM: failed to download binary: ${err.message}`);
    console.error(
      `SPM: install manually from https://github.com/${REPO}/releases`
    );
    // Write a stub that prints an error message
    writeStub(binPath, platform);
  }
}

async function downloadAndExtractTarGz(url, outDir, binName) {
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  // Save the tar.gz to a temp directory, extract there, then move binary to outDir.
  // We must NOT extract directly to outDir because the archive contains a file named
  // "spm" which would overwrite the bin/spm shell wrapper that npm installed.
  const tmpDir = join(outDir, ".tmp");
  mkdirSync(tmpDir, { recursive: true });
  const tmpPath = join(tmpDir, "spm.tar.gz");
  const fileStream = createWriteStream(tmpPath);
  await pipeline(Readable.fromWeb(resp.body), fileStream);

  execSync(`tar -xzf "${tmpPath}" -C "${tmpDir}" spm`, { stdio: "ignore" });
  renameSync(join(tmpDir, "spm"), join(outDir, binName));

  // Clean up temp directory
  unlinkSync(tmpPath);
  rmdirSync(tmpDir);
}

async function downloadAndExtractZip(url, outDir, binName) {
  // For Windows: download zip, extract with PowerShell into a temp dir
  const tmpDir = join(outDir, ".tmp");
  mkdirSync(tmpDir, { recursive: true });
  const tmpPath = join(tmpDir, "spm.zip");
  const resp = await fetch(url, { redirect: "follow" });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  const fileStream = createWriteStream(tmpPath);
  await pipeline(Readable.fromWeb(resp.body), fileStream);

  execSync(
    `powershell -Command "Expand-Archive -Path '${tmpPath}' -DestinationPath '${tmpDir}' -Force"`,
    { stdio: "ignore" }
  );

  const extracted = join(tmpDir, "spm.exe");
  if (existsSync(extracted)) {
    renameSync(extracted, join(outDir, binName));
  }

  unlinkSync(tmpPath);
  rmdirSync(tmpDir);
}

function writeStub(binPath, platform) {
  if (platform === "windows") {
    const content = `@echo off\necho SPM binary not found. Install from https://github.com/${REPO}/releases\nexit /b 1\n`;
    writeFileSync(binPath, content);
  } else {
    const content = `#!/bin/sh\necho "SPM binary not found. Install from https://github.com/${REPO}/releases" >&2\nexit 1\n`;
    writeFileSync(binPath, content, { mode: 0o755 });
  }
}

main();
