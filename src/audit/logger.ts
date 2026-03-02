import { AuditLogEntry, Finding, GuardPRConfig, Patch, ScanResult } from "../types";
import { getContext } from "../utils/github";

import { generateChecksum } from "./schema";

export class AuditLogger {
  build(params: {
    scanResults: ScanResult[];
    findings: Finding[];
    highConfidence: Finding[];
    lowConfidence: Finding[];
    patches: Patch[];
    prCreated: boolean;
    prUrl?: string;
    prNumber?: number;
    totalDurationMs: number;
    errors: string[];
    toolVersions: Record<string, string>;
    config: GuardPRConfig;
  }): AuditLogEntry {
    const ctx = getContext();

    const maskedConfig: Record<string, unknown> = {
      ...params.config,
      githubToken: "***",
    };

    const logWithoutChecksum: Omit<AuditLogEntry, "checksum"> = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      guardprVersion: "0.1.0",
      github: {
        repository: `${ctx.owner}/${ctx.repo}`,
        sha: ctx.sha,
        ref: ctx.ref,
        actor: ctx.actor,
        runId: ctx.runId,
        runAttempt: ctx.runAttempt,
        eventName: ctx.eventName,
      },
      toolVersions: params.toolVersions,
      rulesetHash: "",
      config: maskedConfig,
      scanResults: params.scanResults,
      allFindings: params.findings,
      highConfidenceFindings: params.highConfidence,
      lowConfidenceFindings: params.lowConfidence,
      patches: params.patches,
      prCreated: params.prCreated,
      prUrl: params.prUrl,
      prNumber: params.prNumber,
      totalDurationMs: params.totalDurationMs,
      errors: params.errors,
    };

    const checksum = generateChecksum(logWithoutChecksum);

    return {
      ...logWithoutChecksum,
      checksum,
    };
  }
}
