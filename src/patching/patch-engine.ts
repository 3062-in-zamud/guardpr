import { Finding, Patch } from "../types";
import { info, warn } from "../utils/logger";

import { AuthzMiddlewareStrategy } from "./strategies/authz-middleware";
import { DependencyUpgradeStrategy } from "./strategies/dependency-upgrade";
import { SecretNotificationStrategy } from "./strategies/secret-notification";
import { XssSanitizationStrategy } from "./strategies/xss-sanitization";

export class PatchEngine {
  private secretStrategy = new SecretNotificationStrategy();
  private dependencyStrategy = new DependencyUpgradeStrategy();
  private xssStrategy = new XssSanitizationStrategy();
  private authzStrategy = new AuthzMiddlewareStrategy();

  async generatePatches(findings: Finding[], workDir: string): Promise<Patch[]> {
    const patches: Patch[] = [];

    // Group findings by category
    const secretFindings: Finding[] = [];
    const dependencyFindings: Finding[] = [];
    const xssFindings: Finding[] = [];
    const authzFindings: Finding[] = [];

    for (const finding of findings) {
      switch (finding.category) {
        case "secrets":
          secretFindings.push(finding);
          break;
        case "dependencies":
          dependencyFindings.push(finding);
          break;
        case "xss":
          xssFindings.push(finding);
          break;
        case "authz":
          authzFindings.push(finding);
          break;
      }
    }

    // Secrets: notification-only, grouped into one patch
    if (secretFindings.length > 0) {
      info(`Generating notification for ${secretFindings.length} secret finding(s)`);
      patches.push(this.secretStrategy.generate(secretFindings));
    }

    // Dependencies: one patch per finding
    for (const finding of dependencyFindings) {
      try {
        info(`Generating dependency upgrade patch for ${finding.dependency?.name ?? "unknown"}`);
        const patch = await this.dependencyStrategy.generate(finding, workDir);
        patches.push(patch);
      } catch (err) {
        warn(`Failed to generate patch for dependency ${finding.dependency?.name}: ${String(err)}`);
        patches.push({
          findingFingerprints: [finding.fingerprint],
          title: `Failed to patch ${finding.dependency?.name ?? "unknown"}`,
          type: "auto-fix",
          rationale: `Patch generation failed: ${err instanceof Error ? err.message : String(err)}`,
          rollbackSteps: [],
          fileChanges: [],
          status: "generation-failed",
          breakingRisk: "none",
        });
      }
    }

    // XSS: one patch per finding
    for (const finding of xssFindings) {
      try {
        info(
          `Generating XSS sanitization patch for ${finding.location.file}:${finding.location.startLine}`,
        );
        const patch = await this.xssStrategy.generate(finding, workDir);
        patches.push(patch);
      } catch (err) {
        warn(`Failed to generate XSS patch: ${String(err)}`);
        patches.push({
          findingFingerprints: [finding.fingerprint],
          title: `Failed to patch XSS in ${finding.location.file}`,
          type: "auto-fix",
          rationale: `Patch generation failed: ${err instanceof Error ? err.message : String(err)}`,
          rollbackSteps: [],
          fileChanges: [],
          status: "generation-failed",
          breakingRisk: "none",
        });
      }
    }

    // Authz: one patch per finding
    for (const finding of authzFindings) {
      try {
        info(
          `Generating authz middleware patch for ${finding.location.file}:${finding.location.startLine}`,
        );
        const patch = await this.authzStrategy.generate(finding, workDir);
        patches.push(patch);
      } catch (err) {
        warn(`Failed to generate authz patch: ${String(err)}`);
        patches.push({
          findingFingerprints: [finding.fingerprint],
          title: `Failed to patch authz in ${finding.location.file}`,
          type: "auto-fix",
          rationale: `Patch generation failed: ${err instanceof Error ? err.message : String(err)}`,
          rollbackSteps: [],
          fileChanges: [],
          status: "generation-failed",
          breakingRisk: "none",
        });
      }
    }

    return patches;
  }
}
