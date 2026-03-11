export type DetectionCategory = "secrets" | "dependencies" | "xss" | "authz" | "external";

export type Severity = "P0" | "P1" | "P2";

export interface FindingLocation {
  file: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface ConfidenceFactor {
  name: string;
  score: number;
  reason: string;
}

export interface DependencyInfo {
  name: string;
  ecosystem: string;
  installedVersion: string;
  fixedVersion?: string;
  advisoryUrl?: string;
}

export interface Finding {
  fingerprint: string;
  scannerId: string;
  category: DetectionCategory;
  severity: Severity;
  cwe?: string;
  title: string;
  description: string;
  location: FindingLocation;
  codeSnippet: string;
  confidence: number;
  confidenceFactors: ConfidenceFactor[];
  dependency?: DependencyInfo;
  secretRuleId?: string;
  rawData?: Record<string, unknown>;
}
