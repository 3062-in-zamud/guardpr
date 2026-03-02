import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

import { GuardPRError } from "../types";

interface ToolManifestEntry {
  version: string;
  downloads: Record<string, { url: string; sha256: string }>;
}

const TOOL_MANIFEST: Record<string, ToolManifestEntry> = {
  gitleaks: {
    version: "8.21.2",
    downloads: {
      "linux-x64": {
        url: "https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_linux_x64.tar.gz",
        sha256: "5bc41815076e6ed6ef8fbecc9d9b75bcae31f39029ceb55da08086315316e3ba",
      },
      "darwin-x64": {
        url: "https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_darwin_x64.tar.gz",
        sha256: "5b42c6e4b1fd693eaeb2b5b7faa5f17a1434299d4deb2de63d4b2efd7c753128",
      },
      "darwin-arm64": {
        url: "https://github.com/gitleaks/gitleaks/releases/download/v8.21.2/gitleaks_8.21.2_darwin_arm64.tar.gz",
        sha256: "cad3de5dc9a4d5447d967a70a4d49499c557f04db028274cc324f9ff983f6502",
      },
    },
  },
  "osv-scanner": {
    version: "1.9.1",
    downloads: {
      "linux-x64": {
        url: "https://github.com/google/osv-scanner/releases/download/v1.9.1/osv-scanner_linux_amd64",
        sha256: "c52d68f857d9aa6d6a2e98fcf0fda9e75307d59ee1fe1db26ffc588f1c5fda33",
      },
      "darwin-x64": {
        url: "https://github.com/google/osv-scanner/releases/download/v1.9.1/osv-scanner_darwin_amd64",
        sha256: "00204a20464b502208ce3cc01b9c1d0368a05d68a1a58e0cf1bb92eb4a1321d3",
      },
      "darwin-arm64": {
        url: "https://github.com/google/osv-scanner/releases/download/v1.9.1/osv-scanner_darwin_arm64",
        sha256: "4f21efa6c8819ccdb55218432c244f2b0bb01bd58870ccaf5b622d5c0778bfe2",
      },
    },
  },
};

export function getPlatformKey(): string {
  const platform = os.platform();
  const arch = os.arch();

  let platformStr: string;
  if (platform === "linux") {
    platformStr = "linux";
  } else if (platform === "darwin") {
    platformStr = "darwin";
  } else {
    throw new GuardPRError(`Unsupported platform: ${platform}`, "SCANNER_INSTALL_FAILED", false);
  }

  let archStr: string;
  if (arch === "x64") {
    archStr = "x64";
  } else if (arch === "arm64") {
    archStr = "arm64";
  } else {
    throw new GuardPRError(`Unsupported architecture: ${arch}`, "SCANNER_INSTALL_FAILED", false);
  }

  return `${platformStr}-${archStr}`;
}

export async function verifyChecksum(filePath: string, expected: string): Promise<void> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  if (hash !== expected) {
    throw new GuardPRError(
      `Checksum mismatch for ${filePath}: expected ${expected}, got ${hash}`,
      "CHECKSUM_MISMATCH",
      false,
    );
  }
}

export async function installTool(toolName: string): Promise<string> {
  const manifest = TOOL_MANIFEST[toolName];
  if (manifest === undefined) {
    throw new GuardPRError(`Unknown tool: ${toolName}`, "SCANNER_INSTALL_FAILED", false);
  }

  const platformKey = getPlatformKey();
  const download = manifest.downloads[platformKey];
  if (download === undefined) {
    throw new GuardPRError(
      `No download available for ${toolName} on ${platformKey}`,
      "SCANNER_INSTALL_FAILED",
      false,
    );
  }

  // Check tool-cache first
  const cachedPath = tc.find(toolName, manifest.version);
  if (cachedPath !== "") {
    core.info(`Found cached ${toolName} ${manifest.version} at ${cachedPath}`);
    return path.join(cachedPath, toolName);
  }

  core.info(`Downloading ${toolName} ${manifest.version} for ${platformKey}...`);

  const isTarball = download.url.endsWith(".tar.gz");

  if (isTarball) {
    // Download tar.gz, verify checksum, extract
    const downloadedPath = await tc.downloadTool(download.url);
    await verifyChecksum(downloadedPath, download.sha256);

    const extractedDir = await tc.extractTar(downloadedPath);
    const toolDir = await tc.cacheDir(extractedDir, toolName, manifest.version);

    const binaryPath = path.join(toolDir, toolName);
    await fs.promises.chmod(binaryPath, 0o755);
    return binaryPath;
  } else {
    // Standalone binary: download, verify, chmod
    const downloadedPath = await tc.downloadTool(download.url);
    await verifyChecksum(downloadedPath, download.sha256);

    const toolDir = await tc.cacheFile(downloadedPath, toolName, toolName, manifest.version);

    const binaryPath = path.join(toolDir, toolName);
    await fs.promises.chmod(binaryPath, 0o755);
    return binaryPath;
  }
}
