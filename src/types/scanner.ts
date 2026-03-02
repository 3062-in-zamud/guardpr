import { DetectionCategory, Finding, Severity } from "./finding";
import { GuardPRConfig } from "./config";

export interface ScannerPlugin {
  readonly id: string;
  readonly name: string;
  readonly category: DetectionCategory;
  readonly defaultSeverity: Severity;
  isAvailable(workDir: string): Promise<boolean>;
  install?(workDir: string): Promise<void>;
  version?(): Promise<string>;
  cleanup?(workDir: string): Promise<void>;
  scan(workDir: string, config: GuardPRConfig): Promise<Finding[]>;
}

export type ScanResultStatus = "success" | "partial" | "failed" | "skipped";

export interface ScanResult {
  scannerId: string;
  status: ScanResultStatus;
  findings: Finding[];
  durationMs: number;
  exitCode: number;
  error?: string;
}
