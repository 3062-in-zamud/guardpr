import * as fs from "fs";

import { Finding, Patch } from "../../types";
import { generateUnifiedDiff } from "../diff-generator";

export class AuthzMiddlewareStrategy {
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
        title: `Authz fix failed for ${filePath}:${finding.location.startLine}`,
        type: "auto-fix",
        rationale: `Could not locate line ${finding.location.startLine} in ${filePath}.`,
        rollbackSteps: [],
        fileChanges: [],
        status: "generation-failed",
        breakingRisk: "none",
      };
    }

    // Extract missing middleware names from the finding
    const missingMiddleware = extractMissingMiddleware(finding);
    const modifiedLines = [...lines];

    // Match route patterns like: app.get("/path", handler) or router.post("/path", handler)
    const routePattern =
      /^(\s*(?:\w+)\.(get|post|put|delete|patch|all|use)\s*\(\s*['"`][^'"`]*['"`])\s*,\s*/;
    const match = routePattern.exec(targetLine);

    if (match) {
      const prefix = match[1];
      const rest = targetLine.slice(match[0].length);
      const middlewareInsert = missingMiddleware.join(", ");
      modifiedLines[lineIndex] = `${prefix}, ${middlewareInsert}, ${rest}`;
    } else {
      // Fallback: try to insert middleware before the last argument (handler)
      const fallbackPattern =
        /^(\s*(?:\w+)\.(get|post|put|delete|patch|all|use)\s*\()(.+)\)(\s*;?\s*)$/;
      const fallbackMatch = fallbackPattern.exec(targetLine);

      if (fallbackMatch) {
        const before = fallbackMatch[1];
        const args = fallbackMatch[3] ?? "";
        const after = fallbackMatch[4] ?? "";
        const argParts = args.split(",").map((a) => a.trim());
        const routePath = argParts[0];
        const handler = argParts.slice(1).join(", ");
        const middlewareInsert = missingMiddleware.join(", ");
        modifiedLines[lineIndex] =
          `${before}${routePath}, ${middlewareInsert}, ${handler})${after}`;
      } else {
        return {
          findingFingerprints: [finding.fingerprint],
          title: `Authz fix failed for ${filePath}:${finding.location.startLine}`,
          type: "auto-fix",
          rationale: `Could not parse route pattern at line ${finding.location.startLine}. Manual review required.`,
          rollbackSteps: [],
          fileChanges: [],
          status: "generation-failed",
          breakingRisk: "none",
        };
      }
    }

    const modifiedContent = modifiedLines.join("\n");
    const diff = generateUnifiedDiff(filePath, originalContent, modifiedContent);

    return {
      findingFingerprints: [finding.fingerprint],
      title: `Add auth middleware to ${filePath}:${finding.location.startLine}`,
      type: "auto-fix",
      rationale: `${finding.title}: inserted missing authorization middleware (${missingMiddleware.join(", ")}) into route handler chain.`,
      rollbackSteps: [
        `Revert changes to ${filePath}`,
        "Verify route still works correctly after removing middleware",
      ],
      fileChanges: [
        {
          filePath,
          diff,
          changeType: "modify",
        },
      ],
      status: "pending",
      breakingRisk: "medium",
    };
  }
}

function extractMissingMiddleware(finding: Finding): string[] {
  // Try to extract from rawData
  const rawMiddleware = finding.rawData?.["missingMiddleware"];
  if (Array.isArray(rawMiddleware)) {
    return rawMiddleware.map(String);
  }

  // Fallback: extract from description
  const descMatch = /missing:\s*(.+)/i.exec(finding.description);
  if (descMatch?.[1] !== undefined && descMatch[1] !== "") {
    return descMatch[1]
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
  }

  // Default middleware
  return ["isAuthenticated"];
}
