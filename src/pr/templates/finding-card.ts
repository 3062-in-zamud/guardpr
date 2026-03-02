import { Finding, Patch } from "../../types";

export function renderFindingCard(finding: Finding, patch?: Patch): string {
  const lines: string[] = [];

  const cweLabel = finding.cwe !== undefined && finding.cwe !== "" ? ` (${finding.cwe})` : "";
  lines.push(`### [${finding.severity}] ${finding.title}${cweLabel}`);
  lines.push("");
  lines.push(`- **File**: \`${finding.location.file}:${finding.location.startLine}\``);
  lines.push(`- **Confidence**: ${(finding.confidence * 100).toFixed(0)}%`);
  lines.push(`- **Scanner**: ${finding.scannerId}`);

  // Mask the code snippet — show at most 80 chars
  const maskedSnippet =
    finding.codeSnippet.length > 80
      ? finding.codeSnippet.slice(0, 77) + "..."
      : finding.codeSnippet;
  lines.push(`- **Code**: \`${maskedSnippet}\``);

  if (patch) {
    lines.push(`- **Why this fix**: ${patch.rationale}`);
    lines.push(`- **Impact / Breaking Risk**: ${patch.breakingRisk}`);
    lines.push(`- **Test Results**: ${patch.status}`);
    if (patch.rollbackSteps.length > 0) {
      lines.push(`- **Rollback**: ${patch.rollbackSteps.join(" → ")}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
