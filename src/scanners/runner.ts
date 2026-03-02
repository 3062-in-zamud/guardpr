import * as core from "@actions/core";

import type { GuardPRConfig, ScanResult, ScannerPlugin } from "../types";
import { MaskingLayer } from "../utils/masking";

import { ScannerRegistry } from "./registry";

export interface RunnerOptions {
  timeoutMs: number;
  enabledScanners: string[];
}

export const DEFAULT_RUNNER_OPTIONS: RunnerOptions = {
  timeoutMs: 300_000,
  enabledScanners: ["all"],
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Scanner "${label}" timed out after ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export class ScannerRunner {
  constructor(
    private registry: ScannerRegistry,
    private maskingLayer: MaskingLayer,
  ) {}

  async runAll(
    workDir: string,
    config: GuardPRConfig,
    options: RunnerOptions = DEFAULT_RUNNER_OPTIONS,
  ): Promise<ScanResult[]> {
    const allScanners = this.registry.getAll();
    const scanners = this.filterScanners(allScanners, options.enabledScanners);

    core.info(`Running ${scanners.length} scanner(s)...`);

    const tasks = scanners.map((scanner) =>
      this.runSingleScanner(scanner, workDir, config, options.timeoutMs),
    );

    const settled = await Promise.allSettled(tasks);

    return settled.map((result, index) => {
      const scanner = scanners[index]!;
      if (result.status === "fulfilled") {
        return result.value;
      }
      core.warning(`Scanner "${scanner.id}" failed: ${String(result.reason)}`);
      return {
        scannerId: scanner.id,
        status: "failed" as const,
        findings: [],
        durationMs: 0,
        exitCode: -1,
        error: String(result.reason),
      };
    });
  }

  private filterScanners(scanners: ScannerPlugin[], enabled: string[]): ScannerPlugin[] {
    if (enabled.length === 1 && enabled[0] === "all") {
      return scanners;
    }
    return scanners.filter((s) => enabled.includes(s.id));
  }

  private async runSingleScanner(
    scanner: ScannerPlugin,
    workDir: string,
    config: GuardPRConfig,
    timeoutMs: number,
  ): Promise<ScanResult> {
    const start = Date.now();
    core.startGroup(`Scanner: ${scanner.name}`);

    try {
      // Check availability and install if needed
      const available = await scanner.isAvailable(workDir);
      if (!available && scanner.install != null) {
        core.info(`Installing ${scanner.name}...`);
        await scanner.install(workDir);
      } else if (!available) {
        core.endGroup();
        return {
          scannerId: scanner.id,
          status: "failed",
          findings: [],
          durationMs: Date.now() - start,
          exitCode: -1,
          error: `Scanner "${scanner.id}" is not available and has no installer`,
        };
      }

      if (scanner.version != null) {
        const ver = await scanner.version();
        core.info(`${scanner.name} version: ${ver}`);
      }

      core.info(`Scanning with ${scanner.name}...`);
      const findings = await withTimeout(scanner.scan(workDir, config), timeoutMs, scanner.id);

      // Register any detected secret values for masking
      for (const finding of findings) {
        if (finding.secretRuleId != null && finding.codeSnippet !== "") {
          this.maskingLayer.register(finding.codeSnippet);
        }
      }

      const durationMs = Date.now() - start;
      core.info(`${scanner.name} completed: ${findings.length} finding(s) in ${durationMs}ms`);
      core.endGroup();

      return {
        scannerId: scanner.id,
        status: findings.length > 0 ? "success" : "success",
        findings,
        durationMs,
        exitCode: 0,
      };
    } catch (err) {
      const durationMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      core.warning(`Scanner "${scanner.id}" failed: ${errorMsg}`);
      core.endGroup();

      return {
        scannerId: scanner.id,
        status: "failed",
        findings: [],
        durationMs,
        exitCode: -1,
        error: errorMsg,
      };
    }
  }
}
