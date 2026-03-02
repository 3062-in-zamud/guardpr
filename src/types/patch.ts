export interface FileChange {
  filePath: string;
  diff: string;
  changeType: "create" | "modify" | "delete";
}

export type PatchType = "auto-fix" | "notification-only";

export type PatchStatus =
  | "pending"
  | "tests-passed"
  | "tests-failed"
  | "tests-skipped"
  | "generation-failed";

export type BreakingRisk = "none" | "low" | "medium" | "high";

export interface Patch {
  findingFingerprints: string[];
  title: string;
  type: PatchType;
  rationale: string;
  rollbackSteps: string[];
  fileChanges: FileChange[];
  status: PatchStatus;
  testOutput?: string;
  breakingRisk: BreakingRisk;
}
