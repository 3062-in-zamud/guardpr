import * as fs from "fs";

import * as core from "@actions/core";
import * as exec from "@actions/exec";

import type { Finding, GuardPRConfig, ScannerPlugin } from "../../types";
import { installTool } from "../tool-installer";

import { parseOsvOutput } from "./parser";

const LOCKFILE_NAMES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Gemfile.lock",
  "poetry.lock",
  "go.sum",
  "Cargo.lock",
  "composer.lock",
  "requirements.txt",
];

let binaryPath: string | undefined;

async function detectLockfiles(workDir: string): Promise<string[]> {
  const found: string[] = [];
  for (const name of LOCKFILE_NAMES) {
    const fullPath = `${workDir}/${name}`;
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
      found.push(fullPath);
    } catch {
      // file not found, skip
    }
  }
  return found;
}

export const osvScanner: ScannerPlugin = {
  id: "osv-scanner",
  name: "OSV-Scanner",
  category: "dependencies",
  defaultSeverity: "P1",

  async isAvailable(_workDir: string): Promise<boolean> {
    if (binaryPath !== undefined) {
      try {
        await fs.promises.access(binaryPath, fs.constants.X_OK);
        return true;
      } catch {
        binaryPath = undefined;
      }
    }

    try {
      let output = "";
      await exec.exec("osv-scanner", ["--version"], {
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
        },
      });
      if (output.trim() !== "") {
        return true;
      }
    } catch {
      // not on PATH
    }
    return false;
  },

  async install(_workDir: string): Promise<void> {
    binaryPath = await installTool("osv-scanner");
    core.info(`OSV-Scanner installed at ${binaryPath}`);
  },

  async version(): Promise<string> {
    let output = "";
    const bin = binaryPath ?? "osv-scanner";
    await exec.exec(bin, ["--version"], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });
    return output.trim();
  },

  async scan(workDir: string, _config: GuardPRConfig): Promise<Finding[]> {
    const lockfiles = await detectLockfiles(workDir);
    if (lockfiles.length === 0) {
      core.info("No lockfiles detected, skipping OSV-Scanner");
      return [];
    }

    const bin = binaryPath ?? "osv-scanner";
    const allFindings: Finding[] = [];

    for (const lockfile of lockfiles) {
      const args = ["scan", "--format", "json", "--lockfile", lockfile];

      core.info(`Running: ${bin} ${args.join(" ")}`);

      let stdout = "";
      let stderr = "";
      let exitCode = 0;

      try {
        exitCode = await exec.exec(bin, args, {
          cwd: workDir,
          silent: true,
          ignoreReturnCode: true,
          listeners: {
            stdout: (data: Buffer) => {
              stdout += data.toString();
            },
            stderr: (data: Buffer) => {
              stderr += data.toString();
            },
          },
        });
      } catch (err) {
        core.warning(
          `OSV-Scanner failed for ${lockfile}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      // Exit code 1 means vulnerabilities found, which is expected
      if (exitCode > 1) {
        core.warning(`OSV-Scanner exited with code ${exitCode} for ${lockfile}: ${stderr}`);
        continue;
      }

      if (stdout.trim() !== "") {
        const findings = parseOsvOutput(stdout);
        allFindings.push(...findings);
      }
    }

    return allFindings;
  },
};
