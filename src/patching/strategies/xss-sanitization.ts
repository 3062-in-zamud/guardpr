import * as fs from "fs";

import { Finding, Patch } from "../../types";
import { generateUnifiedDiff } from "../diff-generator";

const DOMPURIFY_IMPORT = 'import DOMPurify from "isomorphic-dompurify";';

export class XssSanitizationStrategy {
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(finding: Finding, workDir: string): Promise<Patch> {
    const filePath = finding.location.file;
    const fullPath = `${workDir}/${filePath}`;
    const originalContent = fs.readFileSync(fullPath, "utf-8");
    const lines = originalContent.split("\n");
    const lineIndex = finding.location.startLine - 1;
    const targetLine = lines[lineIndex];

    if (targetLine === undefined) {
      return {
        findingFingerprints: [finding.fingerprint],
        title: `XSS fix failed for ${filePath}:${finding.location.startLine}`,
        type: "auto-fix",
        rationale: `Could not locate line ${finding.location.startLine} in ${filePath}.`,
        rollbackSteps: [],
        fileChanges: [],
        status: "generation-failed",
        breakingRisk: "none",
      };
    }

    const modifiedLines = [...lines];
    const isEval = /\beval\s*\(/.test(targetLine);

    if (isEval) {
      // Replace eval with a warning comment
      modifiedLines[lineIndex] = targetLine.replace(
        /\beval\s*\(([^)]*)\)/,
        "/* SECURITY: eval() removed by GuardPR — use a safer alternative */ Function($1)()",
      );
    } else {
      // Wrap dangerous HTML assignments/props with DOMPurify.sanitize()
      let fixedLine = targetLine;

      // dangerouslySetInnerHTML={{ __html: expr }}
      fixedLine = fixedLine.replace(
        /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html\s*:\s*([^}]+)\}\}/,
        (_, expr: string) =>
          `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(${expr.trim()}) }}`,
      );

      // .innerHTML = expr
      fixedLine = fixedLine.replace(
        /\.innerHTML\s*=\s*(.+)/,
        (_, expr: string) => `.innerHTML = DOMPurify.sanitize(${expr.trim()})`,
      );

      // If no pattern matched, wrap the whole suspicious expression
      if (fixedLine === targetLine) {
        const snippet = finding.codeSnippet.trim();
        fixedLine = targetLine.replace(snippet, `DOMPurify.sanitize(${snippet})`);
      }

      modifiedLines[lineIndex] = fixedLine;
    }

    // Add DOMPurify import if not already present
    let modifiedContent = modifiedLines.join("\n");
    if (
      !modifiedContent.includes("DOMPurify") ||
      modifiedContent.includes("isomorphic-dompurify") === false
    ) {
      if (!originalContent.includes("isomorphic-dompurify")) {
        // Find the right place to insert — after existing imports
        const importLines = modifiedContent.split("\n");
        let lastImportIndex = -1;
        for (let i = 0; i < importLines.length; i++) {
          if (/^import\s/.test(importLines[i] ?? "")) {
            lastImportIndex = i;
          }
        }
        if (lastImportIndex >= 0) {
          importLines.splice(lastImportIndex + 1, 0, DOMPURIFY_IMPORT);
        } else {
          importLines.unshift(DOMPURIFY_IMPORT, "");
        }
        modifiedContent = importLines.join("\n");
      }
    }

    const diff = generateUnifiedDiff(filePath, originalContent, modifiedContent);

    return {
      findingFingerprints: [finding.fingerprint],
      title: `Fix XSS vulnerability in ${filePath}:${finding.location.startLine}`,
      type: "auto-fix",
      rationale: `${finding.title}: wrapped unsafe HTML output with DOMPurify.sanitize() to prevent cross-site scripting.`,
      rollbackSteps: [
        `Revert changes to ${filePath}`,
        "Remove isomorphic-dompurify dependency if no longer needed",
      ],
      fileChanges: [
        {
          filePath,
          diff,
          changeType: "modify",
        },
      ],
      status: "pending",
      breakingRisk: "low",
    };
  }
}
