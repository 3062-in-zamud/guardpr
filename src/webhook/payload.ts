import { z } from "zod";

import { Finding, Patch, ScanResult } from "../types";

export interface WebhookPayload {
  version: "1.0";
  timestamp: string;
  guardprVersion: string;
  repository: { fullName: string };
  run: { id: number; sha: string; ref: string; actor: string; eventName: string };
  scan: {
    totalFindings: number;
    highConfidenceCount: number;
    lowConfidenceCount: number;
    bySeverity: { P0: number; P1: number; P2: number };
    byCategory: { secrets: number; dependencies: number; xss: number; authz: number; external: number };
    scannerResults: {
      scannerId: string;
      status: string;
      findingCount: number;
      durationMs: number;
    }[];
  };
  patches: { total: number; testsPassed: number; testsFailed: number };
  pr: { created: boolean; url?: string; number?: number };
  performance: { totalDurationMs: number };
}

const webhookPayloadSchema = z
  .object({
    version: z.literal("1.0"),
    timestamp: z.string(),
    guardprVersion: z.string(),
    repository: z.object({ fullName: z.string() }),
    run: z.object({
      id: z.number(),
      sha: z.string(),
      ref: z.string(),
      actor: z.string(),
      eventName: z.string(),
    }),
    scan: z.object({
      totalFindings: z.number(),
      highConfidenceCount: z.number(),
      lowConfidenceCount: z.number(),
      bySeverity: z.object({ P0: z.number(), P1: z.number(), P2: z.number() }),
      byCategory: z.object({
        secrets: z.number(),
        dependencies: z.number(),
        xss: z.number(),
        authz: z.number(),
        external: z.number(),
      }),
      scannerResults: z.array(
        z.object({
          scannerId: z.string(),
          status: z.string(),
          findingCount: z.number(),
          durationMs: z.number(),
        }),
      ),
    }),
    patches: z.object({
      total: z.number(),
      testsPassed: z.number(),
      testsFailed: z.number(),
    }),
    pr: z.object({
      created: z.boolean(),
      url: z.string().optional(),
      number: z.number().optional(),
    }),
    performance: z.object({ totalDurationMs: z.number() }),
  })
  .strict();

export interface BuildWebhookPayloadParams {
  version: string;
  repository: string;
  run: { id: number; sha: string; ref: string; actor: string; eventName: string };
  highConfidence: Finding[];
  lowConfidence: Finding[];
  scanResults: ScanResult[];
  patches: Patch[];
  prCreated: boolean;
  prUrl?: string;
  prNumber?: number;
  totalDurationMs: number;
}

export function countBySeverity(findings: Finding[]): { P0: number; P1: number; P2: number } {
  let P0 = 0;
  let P1 = 0;
  let P2 = 0;
  for (const f of findings) {
    if (f.severity === "P0") P0++;
    else if (f.severity === "P1") P1++;
    else if (f.severity === "P2") P2++;
  }
  return { P0, P1, P2 };
}

function countByCategory(findings: Finding[]): {
  secrets: number;
  dependencies: number;
  xss: number;
  authz: number;
  external: number;
} {
  let secrets = 0;
  let dependencies = 0;
  let xss = 0;
  let authz = 0;
  let external = 0;
  for (const f of findings) {
    if (f.category === "secrets") secrets++;
    else if (f.category === "dependencies") dependencies++;
    else if (f.category === "xss") xss++;
    else if (f.category === "authz") authz++;
    else if (f.category === "external") external++;
  }
  return { secrets, dependencies, xss, authz, external };
}

export function buildWebhookPayload(params: BuildWebhookPayloadParams): WebhookPayload {
  const allFindings = [...params.highConfidence, ...params.lowConfidence];

  const raw: WebhookPayload = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    guardprVersion: params.version,
    repository: { fullName: params.repository },
    run: {
      id: params.run.id,
      sha: params.run.sha,
      ref: params.run.ref,
      actor: params.run.actor,
      eventName: params.run.eventName,
    },
    scan: {
      totalFindings: allFindings.length,
      highConfidenceCount: params.highConfidence.length,
      lowConfidenceCount: params.lowConfidence.length,
      bySeverity: countBySeverity(allFindings),
      byCategory: countByCategory(allFindings),
      scannerResults: params.scanResults.map((r) => ({
        scannerId: r.scannerId,
        status: r.status,
        findingCount: r.findings.length,
        durationMs: r.durationMs,
      })),
    },
    patches: {
      total: params.patches.length,
      testsPassed: params.patches.filter((p) => p.status === "tests-passed").length,
      testsFailed: params.patches.filter((p) => p.status === "tests-failed").length,
    },
    pr: {
      created: params.prCreated,
      ...(params.prUrl !== undefined ? { url: params.prUrl } : {}),
      ...(params.prNumber !== undefined ? { number: params.prNumber } : {}),
    },
    performance: { totalDurationMs: params.totalDurationMs },
  };

  // Validate and strip any unexpected fields via zod
  return webhookPayloadSchema.parse(raw);
}
