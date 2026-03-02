import { Finding } from "./finding";
import { Patch } from "./patch";
import { ScanResult } from "./scanner";

export interface AuditGitHubInfo {
  repository: string;
  sha: string;
  ref: string;
  actor: string;
  runId: number;
  runAttempt: number;
  eventName: string;
}

export interface AuditLogEntry {
  version: "1.0";
  timestamp: string;
  guardprVersion: string;
  github: AuditGitHubInfo;
  toolVersions: Record<string, string>;
  rulesetHash: string;
  config: Record<string, unknown>;
  scanResults: ScanResult[];
  allFindings: Finding[];
  highConfidenceFindings: Finding[];
  lowConfidenceFindings: Finding[];
  patches: Patch[];
  prCreated: boolean;
  prUrl?: string;
  prNumber?: number;
  totalDurationMs: number;
  errors: string[];
  checksum: string;
}
