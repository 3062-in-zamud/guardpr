import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import * as core from "@actions/core";
import * as exec from "@actions/exec";

import type { Finding, GuardPRConfig, ScannerPlugin } from "../../types";
import { installTool } from "../tool-installer";

import { extractSecretValues, parseGitleaksOutput } from "./parser";

let binaryPath: string | undefined;

export const gitleaksScanner: ScannerPlugin = {
  id: "gitleaks",
  name: "Gitleaks",
  category: "secrets",
  defaultSeverity: "P0",

  async isAvailable(_workDir: string): Promise<boolean> {
    if (binaryPath !== undefined) {
      try {
        await fs.promises.access(binaryPath, fs.constants.X_OK);
        return true;
      } catch {
        binaryPath = undefined;
      }
    }

    // Try PATH
    try {
      let output = "";
      await exec.exec("gitleaks", ["version"], {
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
    binaryPath = await installTool("gitleaks");
    core.info(`Gitleaks installed at ${binaryPath}`);
  },

  async version(): Promise<string> {
    let output = "";
    const bin = binaryPath ?? "gitleaks";
    await exec.exec(bin, ["version"], {
      silent: true,
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
      },
    });
    return output.trim();
  },

  async scan(workDir: string, config: GuardPRConfig): Promise<Finding[]> {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gitleaks-"));
    const reportPath = path.join(tmpDir, "report.json");
    const bin = binaryPath ?? "gitleaks";

    const args = [
      "detect",
      "--source",
      workDir,
      "--report-format",
      "json",
      "--report-path",
      reportPath,
      "--no-git",
      "--exit-code",
      "0",
      "--max-target-megabytes",
      String(config.scanners.secrets.maxTargetMegabytes),
    ];

    core.info(`Running: ${bin} ${args.join(" ")}`);

    await exec.exec(bin, args, {
      cwd: workDir,
      silent: true,
    });

    let jsonStr: string;
    try {
      jsonStr = await fs.promises.readFile(reportPath, "utf-8");
    } catch {
      // No report file means no findings
      return [];
    }

    // Register all secret values for masking
    const secrets = extractSecretValues(jsonStr);
    for (const secret of secrets) {
      core.setSecret(secret);
    }

    const findings = parseGitleaksOutput(jsonStr);

    // Cleanup temp dir
    await fs.promises.rm(tmpDir, { recursive: true, force: true });

    return findings;
  },
};
