import { Patch, PatchingConfig } from "../types";

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export class PatchValidator {
  validate(patch: Patch, config: PatchingConfig): ValidationResult {
    const reasons: string[] = [];

    // Check total diff lines
    let totalDiffLines = 0;
    for (const change of patch.fileChanges) {
      const lines = change.diff.split("\n");
      const changedLines = lines.filter((l) => l.startsWith("+") || l.startsWith("-")).length;
      totalDiffLines += changedLines;
    }

    if (totalDiffLines > config.maxLinesPerPatch) {
      reasons.push(
        `Patch has ${totalDiffLines} changed lines, exceeding limit of ${config.maxLinesPerPatch}`,
      );
    }

    // Check total files
    const totalFiles = patch.fileChanges.length;
    if (totalFiles > config.maxFilesPerPatch) {
      reasons.push(
        `Patch modifies ${totalFiles} files, exceeding limit of ${config.maxFilesPerPatch}`,
      );
    }

    // Placeholder: check for new security issues (would require re-scan)
    // This is a placeholder for future integration with scanners

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }
}
