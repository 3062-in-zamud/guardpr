import * as crypto from "crypto";

import { z } from "zod";

import { AuditLogEntry } from "../types";

const confidenceFactorSchema = z.object({
  name: z.string(),
  score: z.number(),
  reason: z.string(),
});

const findingLocationSchema = z.object({
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  startColumn: z.number().optional(),
  endColumn: z.number().optional(),
});

const dependencyInfoSchema = z.object({
  name: z.string(),
  ecosystem: z.string(),
  installedVersion: z.string(),
  fixedVersion: z.string().optional(),
  advisoryUrl: z.string().optional(),
});

const findingSchema = z.object({
  fingerprint: z.string(),
  scannerId: z.string(),
  category: z.enum(["secrets", "dependencies", "xss", "authz"]),
  severity: z.enum(["P0", "P1", "P2"]),
  cwe: z.string().optional(),
  title: z.string(),
  description: z.string(),
  location: findingLocationSchema,
  codeSnippet: z.string(),
  confidence: z.number().min(0).max(1),
  confidenceFactors: z.array(confidenceFactorSchema),
  dependency: dependencyInfoSchema.optional(),
  secretRuleId: z.string().optional(),
  rawData: z.record(z.unknown()).optional(),
});

const fileChangeSchema = z.object({
  filePath: z.string(),
  diff: z.string(),
  changeType: z.enum(["create", "modify", "delete"]),
});

const patchSchema = z.object({
  findingFingerprints: z.array(z.string()),
  title: z.string(),
  type: z.enum(["auto-fix", "notification-only"]),
  rationale: z.string(),
  rollbackSteps: z.array(z.string()),
  fileChanges: z.array(fileChangeSchema),
  status: z.enum(["pending", "tests-passed", "tests-failed", "tests-skipped", "generation-failed"]),
  testOutput: z.string().optional(),
  breakingRisk: z.enum(["none", "low", "medium", "high"]),
});

const scanResultSchema = z.object({
  scannerId: z.string(),
  status: z.enum(["success", "partial", "failed", "skipped"]),
  findings: z.array(findingSchema),
  durationMs: z.number(),
  exitCode: z.number(),
  error: z.string().optional(),
});

const githubInfoSchema = z.object({
  repository: z.string(),
  sha: z.string(),
  ref: z.string(),
  actor: z.string(),
  runId: z.number(),
  runAttempt: z.number(),
  eventName: z.string(),
});

export const auditLogSchema = z.object({
  version: z.literal("1.0"),
  timestamp: z.string().datetime(),
  guardprVersion: z.string(),
  github: githubInfoSchema,
  toolVersions: z.record(z.string()),
  rulesetHash: z.string(),
  config: z.record(z.unknown()),
  scanResults: z.array(scanResultSchema),
  allFindings: z.array(findingSchema),
  highConfidenceFindings: z.array(findingSchema),
  lowConfidenceFindings: z.array(findingSchema),
  patches: z.array(patchSchema),
  prCreated: z.boolean(),
  prUrl: z.string().optional(),
  prNumber: z.number().optional(),
  totalDurationMs: z.number(),
  errors: z.array(z.string()),
  checksum: z.string(),
});

export function generateChecksum(log: Omit<AuditLogEntry, "checksum">): string {
  const json = JSON.stringify(log);
  return crypto.createHash("sha256").update(json).digest("hex");
}
