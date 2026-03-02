import * as crypto from "crypto";

import type { DependencyInfo, Finding } from "../../types";

interface OsvVulnerability {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: Array<{
    type: string;
    score: string;
  }>;
  affected?: Array<{
    ranges?: Array<{
      type: string;
      events?: Array<{
        introduced?: string;
        fixed?: string;
      }>;
    }>;
  }>;
  references?: Array<{
    type: string;
    url: string;
  }>;
  database_specific?: Record<string, unknown>;
}

interface OsvPackage {
  name: string;
  version: string;
  ecosystem: string;
}

interface OsvGroup {
  ids: string[];
  aliases?: string[];
  max_severity?: string;
}

interface OsvPackageResult {
  package: OsvPackage;
  vulnerabilities: OsvVulnerability[];
  groups?: OsvGroup[];
}

interface OsvSourceResult {
  source: {
    path: string;
    type: string;
  };
  packages: OsvPackageResult[];
}

interface OsvOutput {
  results: OsvSourceResult[];
}

function computeFingerprint(vulnId: string, packageName: string, version: string): string {
  const raw = `osv:${vulnId}:${packageName}:${version}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function extractFixedVersion(vuln: OsvVulnerability): string | undefined {
  if (vuln.affected === undefined) {
    return undefined;
  }
  for (const affected of vuln.affected) {
    if (affected.ranges === undefined) {
      continue;
    }
    for (const range of affected.ranges) {
      if (range.events === undefined) {
        continue;
      }
      for (const event of range.events) {
        if (event.fixed !== undefined) {
          return event.fixed;
        }
      }
    }
  }
  return undefined;
}

function extractAdvisoryUrl(vuln: OsvVulnerability): string | undefined {
  if (vuln.references === undefined) {
    return undefined;
  }
  const advisory = vuln.references.find((r) => r.type === "ADVISORY" || r.type === "WEB");
  return advisory?.url;
}

function mapSeverity(vuln: OsvVulnerability): "P0" | "P1" | "P2" {
  if (vuln.severity !== undefined && vuln.severity.length > 0) {
    const score = parseFloat(vuln.severity[0]!.score);
    if (!isNaN(score)) {
      if (score >= 9.0) return "P0";
      if (score >= 7.0) return "P1";
    }
  }
  return "P1";
}

export function parseOsvOutput(jsonStr: string): Finding[] {
  if (jsonStr.trim() === "") {
    return [];
  }

  const output: OsvOutput = JSON.parse(jsonStr) as OsvOutput;
  const findings: Finding[] = [];

  if (output.results === undefined) {
    return [];
  }

  for (const sourceResult of output.results) {
    const lockfilePath = sourceResult.source.path;

    for (const pkgResult of sourceResult.packages) {
      const pkg = pkgResult.package;

      for (const vuln of pkgResult.vulnerabilities) {
        const fixedVersion = extractFixedVersion(vuln);
        const advisoryUrl = extractAdvisoryUrl(vuln);

        const depInfo: DependencyInfo = {
          name: pkg.name,
          ecosystem: pkg.ecosystem,
          installedVersion: pkg.version,
          fixedVersion,
          advisoryUrl,
        };

        const cweEntry = vuln.database_specific?.["cwe_ids"] as string[] | undefined;

        findings.push({
          fingerprint: computeFingerprint(vuln.id, pkg.name, pkg.version),
          scannerId: "osv-scanner",
          category: "dependencies",
          severity: mapSeverity(vuln),
          cwe: cweEntry?.[0],
          title: `${vuln.id}: ${vuln.summary ?? "Vulnerability in " + pkg.name}`,
          description:
            vuln.details ?? `Vulnerability ${vuln.id} found in ${pkg.name}@${pkg.version}.`,
          location: {
            file: lockfilePath,
            startLine: 1,
            endLine: 1,
          },
          codeSnippet: `${pkg.name}@${pkg.version}`,
          confidence: 0.95,
          confidenceFactors: [
            {
              name: "osv-database",
              score: 0.95,
              reason: `Matched vulnerability ${vuln.id} in OSV database`,
            },
            ...(fixedVersion !== undefined
              ? [
                  {
                    name: "fix-available",
                    score: 1.0,
                    reason: `Fix available: upgrade to ${fixedVersion}`,
                  },
                ]
              : []),
          ],
          dependency: depInfo,
          rawData: vuln as unknown as Record<string, unknown>,
        });
      }
    }
  }

  return findings;
}
