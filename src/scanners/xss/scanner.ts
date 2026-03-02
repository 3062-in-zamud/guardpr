import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { GuardPRConfig } from "../../types/config";
import { Finding } from "../../types/finding";
import { ScannerPlugin } from "../../types/scanner";

import { analyzeContext } from "./context-analyzer";
import { ALL_XSS_RULES } from "./rules";

const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "build", "coverage"]);

function walkFiles(dir: string): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile() && TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

function generateFingerprint(ruleName: string, file: string, line: number): string {
  const input = `xss:${ruleName}:${file}:${line}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getCodeSnippet(content: string, line: number, contextLines: number = 3): string {
  const lines = content.split("\n");
  const start = Math.max(0, line - 1 - contextLines);
  const end = Math.min(lines.length, line + contextLines);
  return lines.slice(start, end).join("\n");
}

export class XssScanner implements ScannerPlugin {
  readonly id = "xss";
  readonly name = "XSS Detector";
  readonly category = "xss" as const;
  readonly defaultSeverity = "P1" as const;

  // eslint-disable-next-line @typescript-eslint/require-await
  async isAvailable(_workDir: string): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async scan(workDir: string, config: GuardPRConfig): Promise<Finding[]> {
    const findings: Finding[] = [];
    const customSanitizers = config.scanners.xss.customSanitizers;
    const files = walkFiles(workDir);

    for (const filePath of files) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      const relativePath = path.relative(workDir, filePath);

      for (const rule of ALL_XSS_RULES) {
        const matches = rule.scan(content, relativePath);

        for (const match of matches) {
          const contextResult = analyzeContext(content, relativePath, match.line, customSanitizers);
          const fingerprint = generateFingerprint(rule.name, relativePath, match.line);

          findings.push({
            fingerprint,
            scannerId: this.id,
            category: this.category,
            severity: this.defaultSeverity,
            cwe: match.cwe,
            title: `${rule.name}: ${match.description}`,
            description: match.description,
            location: {
              file: relativePath,
              startLine: match.line,
              endLine: match.endLine,
              startColumn: match.column,
              endColumn: match.endColumn,
            },
            codeSnippet: getCodeSnippet(content, match.line),
            confidence: contextResult.confidence,
            confidenceFactors: contextResult.factors,
          });
        }
      }
    }

    return findings;
  }
}
