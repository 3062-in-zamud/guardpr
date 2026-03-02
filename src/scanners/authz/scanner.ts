import * as crypto from "node:crypto";
import * as fs from "node:fs";

import { GuardPRConfig } from "../../types/config";
import { Finding } from "../../types/finding";
import { ScannerPlugin } from "../../types/scanner";

import { checkMiddleware } from "./middleware-checker";
import { analyzeRoutes } from "./route-analyzer";

function generateFingerprint(
  method: string,
  routePath: string,
  file: string,
  line: number,
): string {
  const input = `authz:${method}:${routePath}:${file}:${line}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getCodeSnippet(filePath: string, line: number, contextLines: number = 3): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const start = Math.max(0, line - 1 - contextLines);
    const end = Math.min(lines.length, line + contextLines);
    return lines.slice(start, end).join("\n");
  } catch {
    return "";
  }
}

export class AuthzScanner implements ScannerPlugin {
  readonly id = "authz";
  readonly name = "Authorization Checker";
  readonly category = "authz" as const;
  readonly defaultSeverity = "P0" as const;

  // eslint-disable-next-line @typescript-eslint/require-await
  async isAvailable(_workDir: string): Promise<boolean> {
    return true;
  }

  async scan(workDir: string, config: GuardPRConfig): Promise<Finding[]> {
    const authzConfig = config.scanners.authz;

    if (authzConfig.protectedRoutes.length === 0) {
      return [];
    }

    const routes = await analyzeRoutes(workDir, authzConfig);
    const violations = checkMiddleware(routes, authzConfig);

    const findings: Finding[] = [];

    for (const violation of violations) {
      const fingerprint = generateFingerprint(
        violation.route.method,
        violation.route.path,
        violation.route.file,
        violation.route.line,
      );

      const missingStr = violation.missingMiddleware.join(", ");
      const title = `Missing authorization middleware on ${violation.route.method} ${violation.route.path}`;
      const description =
        `Route ${violation.route.method} ${violation.route.path} is missing required middleware: ${missingStr}. ` +
        `Expected: [${violation.expectedMiddleware.join(", ")}], ` +
        `Found: [${violation.route.middlewares.join(", ")}].`;

      const codeSnippet = getCodeSnippet(
        `${workDir}/${violation.route.file}`,
        violation.route.line,
      );

      findings.push({
        fingerprint,
        scannerId: this.id,
        category: this.category,
        severity: this.defaultSeverity,
        cwe: "CWE-862",
        title,
        description,
        location: {
          file: violation.route.file,
          startLine: violation.route.line,
          endLine: violation.route.line,
        },
        codeSnippet,
        confidence: violation.confidence,
        confidenceFactors: [
          {
            name:
              violation.missingMiddleware.length === violation.expectedMiddleware.length
                ? "all-middleware-missing"
                : "partial-middleware-missing",
            score: violation.confidence,
            reason:
              violation.missingMiddleware.length === violation.expectedMiddleware.length
                ? "All required authorization middleware is missing from this route."
                : "Some required authorization middleware is missing from this route.",
          },
        ],
      });
    }

    return findings;
  }
}
