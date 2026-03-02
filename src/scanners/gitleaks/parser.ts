import * as crypto from "crypto";

import type { Finding } from "../../types";

interface GitleaksEntry {
  RuleID: string;
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  SymlinkFile?: string;
  Commit?: string;
  Entropy?: number;
  Author?: string;
  Email?: string;
  Date?: string;
  Message?: string;
  Tags?: string[];
  Fingerprint?: string;
}

function computeFingerprint(ruleId: string, file: string, startLine: number): string {
  const raw = `gitleaks:${ruleId}:${file}:${startLine}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function maskSecret(snippet: string, secret: string): string {
  if (secret === "") {
    return snippet;
  }
  return snippet.split(secret).join("***");
}

export function parseGitleaksOutput(jsonStr: string): Finding[] {
  if (jsonStr.trim() === "" || jsonStr.trim() === "null") {
    return [];
  }

  const entries: GitleaksEntry[] = JSON.parse(jsonStr) as GitleaksEntry[];

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry): Finding => {
    const maskedSnippet = maskSecret(entry.Match, entry.Secret);

    return {
      fingerprint: computeFingerprint(entry.RuleID, entry.File, entry.StartLine),
      scannerId: "gitleaks",
      category: "secrets",
      severity: "P0",
      title: `Secret detected: ${entry.Description}`,
      description: `Gitleaks detected a potential secret matching rule "${entry.RuleID}" in ${entry.File} at line ${entry.StartLine}.`,
      location: {
        file: entry.File,
        startLine: entry.StartLine,
        endLine: entry.EndLine,
        startColumn: entry.StartColumn,
        endColumn: entry.EndColumn,
      },
      codeSnippet: maskedSnippet,
      confidence: entry.Entropy !== undefined && entry.Entropy > 3.5 ? 0.95 : 0.85,
      confidenceFactors: [
        {
          name: "rule-match",
          score: 0.9,
          reason: `Matched Gitleaks rule: ${entry.RuleID}`,
        },
        ...(entry.Entropy !== undefined
          ? [
              {
                name: "entropy",
                score: Math.min(entry.Entropy / 5, 1),
                reason: `Shannon entropy: ${entry.Entropy.toFixed(2)}`,
              },
            ]
          : []),
      ],
      secretRuleId: entry.RuleID,
      rawData: entry as unknown as Record<string, unknown>,
    };
  });
}

export function extractSecretValues(jsonStr: string): string[] {
  if (jsonStr.trim() === "" || jsonStr.trim() === "null") {
    return [];
  }

  const entries: GitleaksEntry[] = JSON.parse(jsonStr) as GitleaksEntry[];
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((e) => e.Secret).filter((s) => s !== undefined && s.length >= 4);
}
