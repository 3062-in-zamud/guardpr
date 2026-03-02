import * as core from "@actions/core";

import { AuditLogger } from "./audit/logger";
import { ArtifactUploader } from "./audit/artifact-uploader";
import { loadConfig, ActionInputs } from "./config/loader";
import { MaskingLayer } from "./masking/masking-layer";
import { PatchEngine } from "./patching/patch-engine";
import { PatchValidator } from "./patching/patch-validator";
import { TestRunner } from "./patching/test-runner";
import { PRComposer } from "./pr/composer";
import { PRCreator } from "./pr/creator";
import { ScannerRegistry } from "./scanners/registry";
import { ScannerRunner } from "./scanners/runner";
import { gitleaksScanner } from "./scanners/gitleaks/scanner";
import { osvScanner } from "./scanners/osv-scanner/scanner";
import { XssScanner } from "./scanners/xss/scanner";
import { AuthzScanner } from "./scanners/authz/scanner";
import { ConfidenceScorer } from "./scoring/confidence-scorer";
import { filterByThreshold } from "./scoring/threshold-filter";
import { Finding, GuardPRError, Patch, ScanResult } from "./types";
import { MaskingLayer as RunnerMaskingLayer } from "./utils/masking";
import { getContext } from "./utils/github";
import { info, warn, error, startGroup, endGroup, writeSummary } from "./utils/logger";

const VERSION = "0.1.0";

function parseActionInputs(): ActionInputs {
  return {
    configPath: core.getInput("config-path") || ".guardpr.yml",
    confidenceThreshold: parseFloat(core.getInput("confidence-threshold") || "0.9"),
    createPr: core.getInput("create-pr") !== "false",
    runTests: core.getInput("run-tests") !== "false",
    testCommand: core.getInput("test-command") || "npm test",
    scanners: core.getInput("scanners") || "all",
    githubToken: core.getInput("github-token"),
  };
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const finding of findings) {
    if (!seen.has(finding.fingerprint)) {
      seen.set(finding.fingerprint, finding);
    }
  }
  return Array.from(seen.values());
}

function buildStepSummary(
  highConfidence: Finding[],
  lowConfidence: Finding[],
  patches: Patch[],
  prUrl: string | undefined,
): string {
  const lines: string[] = [];
  lines.push("## GuardPR Security Scan Results\n");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total findings | ${highConfidence.length + lowConfidence.length} |`);
  lines.push(`| High confidence | ${highConfidence.length} |`);
  lines.push(`| Below threshold | ${lowConfidence.length} |`);
  lines.push(`| Patches generated | ${patches.length} |`);

  const passed = patches.filter((p) => p.status === "tests-passed").length;
  const failed = patches.filter((p) => p.status === "tests-failed").length;
  lines.push(`| Tests passed | ${passed} |`);
  lines.push(`| Tests failed | ${failed} |`);
  lines.push("");

  if (prUrl !== undefined) {
    lines.push(`**Draft PR**: ${prUrl}\n`);
  }

  if (highConfidence.length > 0) {
    lines.push("### High-Confidence Findings\n");
    lines.push("| Severity | Category | File | Title | Confidence |");
    lines.push("|----------|----------|------|-------|------------|");
    for (const f of highConfidence) {
      lines.push(
        `| ${f.severity} | ${f.category} | \`${f.location.file}:${f.location.startLine}\` | ${f.title} | ${f.confidence.toFixed(2)} |`,
      );
    }
    lines.push("");
  }

  if (lowConfidence.length > 0) {
    lines.push("### Below-Threshold Findings\n");
    lines.push("| Category | File | Confidence |");
    lines.push("|----------|------|------------|");
    for (const f of lowConfidence) {
      lines.push(
        `| ${f.category} | \`${f.location.file}:${f.location.startLine}\` | ${f.confidence.toFixed(2)} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function emitAnnotations(findings: Finding[]): void {
  for (const finding of findings) {
    core.warning(
      `[${finding.severity}] ${finding.title} (confidence: ${finding.confidence.toFixed(2)})`,
      {
        file: finding.location.file,
        startLine: finding.location.startLine,
        endLine: finding.location.endLine,
        startColumn: finding.location.startColumn,
        endColumn: finding.location.endColumn,
      },
    );
  }
}

async function run(): Promise<void> {
  const startTime = Date.now();
  const errors: string[] = [];
  const toolVersions: Record<string, string> = {};

  try {
    // 1. Parse action inputs
    startGroup("Configuration");
    const actionInputs = parseActionInputs();

    if (actionInputs.githubToken === "") {
      throw new GuardPRError("github-token input is required", "PERMISSION_ERROR", false);
    }

    // 2. Load config
    info(`Loading config from ${actionInputs.configPath}`);
    const config = await loadConfig(actionInputs.configPath, actionInputs);
    info(`Confidence threshold: ${config.confidenceThreshold}`);
    info(`Scanners: ${actionInputs.scanners}`);
    endGroup();

    // 3. Set up scanner registry
    startGroup("Scanner Setup");
    const registry = new ScannerRegistry();
    const runnerMaskingLayer = new RunnerMaskingLayer();

    if (config.scanners.secrets.enabled) {
      registry.register(gitleaksScanner);
    }
    if (config.scanners.dependencies.enabled) {
      registry.register(osvScanner);
    }
    if (config.scanners.xss.enabled) {
      registry.register(new XssScanner());
    }
    if (config.scanners.authz.enabled) {
      registry.register(new AuthzScanner());
    }

    info(`Registered ${registry.getAll().length} scanner(s)`);
    endGroup();

    // 4. Run scanners in parallel
    startGroup("Scanning");
    const workDir = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
    const runner = new ScannerRunner(registry, runnerMaskingLayer);
    const enabledScanners =
      actionInputs.scanners === "all"
        ? ["all"]
        : actionInputs.scanners.split(",").map((s) => s.trim());

    const scanResults: ScanResult[] = await runner.runAll(workDir, config, {
      timeoutMs: 300_000,
      enabledScanners,
    });

    // Collect tool versions from scanners that support it
    for (const scanner of registry.getAll()) {
      if (scanner.version != null) {
        try {
          toolVersions[scanner.id] = await scanner.version();
        } catch {
          toolVersions[scanner.id] = "unknown";
        }
      }
    }

    // Log scan results summary
    for (const result of scanResults) {
      if (result.status === "failed") {
        errors.push(`Scanner ${result.scannerId} failed: ${result.error ?? "unknown"}`);
        warn(`Scanner ${result.scannerId} failed: ${result.error ?? "unknown"}`);
      } else {
        info(`Scanner ${result.scannerId}: ${result.findings.length} finding(s)`);
      }
    }
    endGroup();

    // 5. Collect and deduplicate findings
    startGroup("Processing Findings");
    const allRawFindings = scanResults.flatMap((r) => r.findings);
    info(`Raw findings: ${allRawFindings.length}`);

    const deduplicated = deduplicateFindings(allRawFindings);
    info(`After deduplication: ${deduplicated.length}`);

    // 6. Mask findings
    const maskingLayer = new MaskingLayer();
    const maskedFindings = deduplicated.map((f) => maskingLayer.maskFinding(f));

    // 7. Score confidence
    const scorer = new ConfidenceScorer();
    const scoredFindings = scorer.score(maskedFindings);

    // 8. Filter by threshold
    const { highConfidence, lowConfidence } = filterByThreshold(
      scoredFindings,
      config.confidenceThreshold,
    );
    info(`High confidence: ${highConfidence.length}, Below threshold: ${lowConfidence.length}`);
    endGroup();

    // 9. Generate patches for high-confidence findings
    let patches: Patch[] = [];
    if (highConfidence.length > 0) {
      startGroup("Patch Generation");
      const patchEngine = new PatchEngine();
      patches = await patchEngine.generatePatches(highConfidence, workDir);

      // 10. Validate patches
      const validator = new PatchValidator();
      patches = patches.map((patch) => {
        if (patch.type === "notification-only" || patch.status === "generation-failed") {
          return patch;
        }
        const validation = validator.validate(patch, config.patching);
        if (!validation.valid) {
          warn(`Patch "${patch.title}" failed validation: ${validation.reasons.join(", ")}`);
          return { ...patch, status: "generation-failed" as const };
        }
        return patch;
      });

      // 11. Run tests on auto-fix patches
      if (config.runTests) {
        const testRunner = new TestRunner();
        const testedPatches: Patch[] = [];
        for (const patch of patches) {
          if (patch.type === "auto-fix" && patch.status !== "generation-failed") {
            const tested = await testRunner.runTests(patch, workDir, config.testCommand);
            testedPatches.push(tested);
          } else {
            testedPatches.push(patch);
          }
        }
        patches = testedPatches;
      }

      info(
        `Patches: ${patches.length} generated, ${patches.filter((p) => p.status === "tests-passed").length} tests passed`,
      );
      endGroup();
    }

    // 12. Create PR
    let prUrl: string | undefined;
    let prNumber: number | undefined;
    let prCreated = false;

    if (config.createPr && highConfidence.length > 0) {
      startGroup("PR Creation");
      const ctx = getContext();
      const composer = new PRComposer();
      const composition = composer.compose({
        findings: highConfidence,
        lowConfidenceFindings: lowConfidence,
        patches,
        context: {
          runId: ctx.runId,
          sha: ctx.sha,
          version: VERSION,
        },
      });

      const creator = new PRCreator();
      const baseBranch = ctx.ref.replace("refs/heads/", "");
      const result = await creator.create(composition, {
        owner: ctx.owner,
        repo: ctx.repo,
        baseBranch,
        token: config.githubToken,
      });

      if (result !== null) {
        prUrl = result.url;
        prNumber = result.number;
        prCreated = true;
        info(`Created draft PR #${result.number}: ${result.url}`);
      } else {
        info("PR creation skipped (duplicate detected)");
      }
      endGroup();
    }

    // 13. Step Summary
    startGroup("Summary");
    const summaryMarkdown = buildStepSummary(highConfidence, lowConfidence, patches, prUrl);
    await writeSummary(summaryMarkdown);
    endGroup();

    // 14. File annotations
    emitAnnotations(highConfidence);

    // 15. Audit log
    startGroup("Audit");
    const auditLogger = new AuditLogger();
    const auditLog = auditLogger.build({
      scanResults,
      findings: scoredFindings,
      highConfidence,
      lowConfidence,
      patches,
      prCreated,
      prUrl,
      prNumber,
      totalDurationMs: Date.now() - startTime,
      errors,
      toolVersions,
      config,
    });

    const maskedLog = maskingLayer.maskAuditLog(auditLog);

    try {
      const uploader = new ArtifactUploader();
      const ctx = getContext();
      const artifactName = await uploader.upload(maskedLog, ctx.runId);
      core.setOutput("audit-artifact-name", artifactName);
    } catch (err) {
      warn(`Failed to upload audit artifact: ${err instanceof Error ? err.message : String(err)}`);
    }
    endGroup();

    // 16. Set action outputs
    core.setOutput("findings-count", String(scoredFindings.length));
    core.setOutput("high-confidence-count", String(highConfidence.length));
    core.setOutput("low-confidence-count", String(lowConfidence.length));
    if (prUrl !== undefined) {
      core.setOutput("pr-url", prUrl);
    }
    if (prNumber !== undefined) {
      core.setOutput("pr-number", String(prNumber));
    }

    info(`GuardPR completed in ${Date.now() - startTime}ms`);
  } catch (err) {
    if (err instanceof GuardPRError) {
      error(`GuardPR error [${err.code}]: ${err.message}`);
      if (!err.recoverable) {
        core.setFailed(`GuardPR failed: ${err.message}`);
        return;
      }
      warn(`Recoverable error: ${err.message}`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      error(`Unexpected error: ${msg}`);
      core.setFailed(`GuardPR failed: ${msg}`);
    }
  }
}

void run();
