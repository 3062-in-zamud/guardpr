export type {
  DetectionCategory,
  Severity,
  FindingLocation,
  ConfidenceFactor,
  DependencyInfo,
  Finding,
} from "./finding";

export type { FileChange, PatchType, PatchStatus, BreakingRisk, Patch } from "./patch";

export type { ScannerPlugin, ScanResultStatus, ScanResult } from "./scanner";

export type {
  AuthzProtectedRoute,
  AuthzScannerConfig,
  XssScannerConfig,
  SecretsScannerConfig,
  DependencyScannerConfig,
  ScannersConfig,
  PatchingConfig,
  ProConfig,
  GuardPRConfig,
} from "./config";

export type { AuditGitHubInfo, AuditLogEntry } from "./audit-log";

export { GuardPRError } from "./errors";
export type { ErrorCode } from "./errors";
