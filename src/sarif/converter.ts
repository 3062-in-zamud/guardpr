import * as crypto from "crypto";

import { DetectionCategory, Finding, Severity } from "../types";

import { SarifLog, SarifResult, SarifRule } from "./types";

const CWE_CATEGORY_MAP: Record<number, DetectionCategory> = {
  79: "xss",
  80: "xss",
  87: "xss",
  116: "xss",
  798: "secrets",
  321: "secrets",
  259: "secrets",
  862: "authz",
  863: "authz",
  284: "authz",
  285: "authz",
};

function levelToSeverity(level?: string): Severity {
  switch (level) {
    case "error":
      return "P0";
    case "warning":
      return "P1";
    default:
      return "P2";
  }
}

function extractCweNumbers(tags?: string[]): number[] {
  if (!tags) return [];
  const cwes: number[] = [];
  for (const tag of tags) {
    const match = /^(?:external\/)?cwe\/cwe-(\d+)$/i.exec(tag);
    if (match) {
      cwes.push(parseInt(match[1]!, 10));
    }
  }
  return cwes;
}

function inferCategory(cwes: number[]): DetectionCategory {
  for (const cwe of cwes) {
    const cat = CWE_CATEGORY_MAP[cwe];
    if (cat) return cat;
  }
  return "external";
}

function generateFingerprint(toolName: string, ruleId: string, uri: string, startLine: number): string {
  const raw = `${toolName}:${ruleId}:${uri}:${startLine}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function convertSarifToFindings(sarifLog: SarifLog): Finding[] {
  const findings: Finding[] = [];

  for (const run of sarifLog.runs) {
    const toolName = run.tool.driver.name;
    const rulesMap = new Map<string, SarifRule>();
    for (const rule of run.tool.driver.rules ?? []) {
      rulesMap.set(rule.id, rule);
    }

    for (const result of run.results ?? []) {
      findings.push(convertResult(result, toolName, rulesMap));
    }
  }

  return findings;
}

function convertResult(
  result: SarifResult,
  toolName: string,
  rulesMap: Map<string, SarifRule>,
): Finding {
  const ruleId = result.ruleId ?? "unknown";
  const rule = rulesMap.get(ruleId);

  const loc = result.locations?.[0]?.physicalLocation;
  const uri = loc?.artifactLocation?.uri ?? "unknown";
  const region = loc?.region;
  const startLine = region?.startLine ?? 1;
  const endLine = region?.endLine ?? startLine;

  const cwes = extractCweNumbers(rule?.properties?.tags);
  const category = inferCategory(cwes);

  const fingerprint =
    result.fingerprints && Object.keys(result.fingerprints).length > 0
      ? Object.values(result.fingerprints)[0]!
      : generateFingerprint(toolName, ruleId, uri, startLine);

  const title = rule?.shortDescription?.text ?? result.message.text ?? ruleId;
  const description = rule?.fullDescription?.text ?? result.message.text ?? "";

  return {
    fingerprint,
    scannerId: `sarif:${toolName}`,
    category,
    severity: levelToSeverity(result.level),
    cwe: cwes.length > 0 ? `CWE-${cwes[0]}` : undefined,
    title,
    description,
    location: {
      file: uri,
      startLine,
      endLine,
      startColumn: region?.startColumn,
      endColumn: region?.endColumn,
    },
    codeSnippet: "",
    confidence: 0.95,
    confidenceFactors: [
      {
        name: "externalTool",
        score: 0.95,
        reason: `External tool finding from ${toolName}`,
      },
    ],
  };
}
