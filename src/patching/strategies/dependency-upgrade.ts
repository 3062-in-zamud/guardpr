import * as fs from "fs";
import * as path from "path";

import { Finding, Patch } from "../../types";
import { generateUnifiedDiff } from "../diff-generator";

function classifyVersionBump(from: string, to: string): "major" | "minor" | "patch" {
  const fromParts = from.replace(/^[^0-9]*/, "").split(".");
  const toParts = to.replace(/^[^0-9]*/, "").split(".");
  const fromMajor = parseInt(fromParts[0] ?? "0", 10);
  const toMajor = parseInt(toParts[0] ?? "0", 10);
  if (toMajor > fromMajor) {
    return "major";
  }
  const fromMinor = parseInt(fromParts[1] ?? "0", 10);
  const toMinor = parseInt(toParts[1] ?? "0", 10);
  if (toMinor > fromMinor) {
    return "minor";
  }
  return "patch";
}

function breakingRiskFromBump(bump: "major" | "minor" | "patch"): "high" | "low" | "none" {
  switch (bump) {
    case "major":
      return "high";
    case "minor":
      return "low";
    case "patch":
      return "none";
  }
}

export class DependencyUpgradeStrategy {
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(finding: Finding, workDir: string): Promise<Patch> {
    const dep = finding.dependency;
    if (
      dep === undefined ||
      dep === null ||
      dep.fixedVersion === undefined ||
      dep.fixedVersion === ""
    ) {
      return {
        findingFingerprints: [finding.fingerprint],
        title: `No fix available for ${dep?.name ?? "unknown dependency"}`,
        type: "notification-only",
        rationale: `Vulnerability found in ${dep?.name ?? "unknown"} (${dep?.installedVersion ?? "unknown"}) but no fixed version is available yet.`,
        rollbackSteps: ["N/A — notification only"],
        fileChanges: [],
        status: "tests-skipped",
        breakingRisk: "none",
      };
    }

    const pkgJsonPath = path.join(workDir, "package.json");
    const originalContent = fs.readFileSync(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(originalContent) as Record<string, unknown>;

    const depName = dep.name;
    const fixedVersion = dep.fixedVersion;
    const isIndirect = finding.title.toLowerCase().includes("indirect");

    let modified = false;

    if (!isIndirect) {
      // Direct dependency: update in dependencies or devDependencies
      for (const section of ["dependencies", "devDependencies"] as const) {
        const deps = pkg[section] as Record<string, string> | undefined;
        if (deps && depName in deps) {
          deps[depName] = fixedVersion;
          modified = true;
        }
      }
    }

    if (isIndirect || !modified) {
      // Indirect dependency or not found in direct deps: add to overrides
      const overrides = (pkg["overrides"] as Record<string, string> | undefined) ?? {};
      overrides[depName] = fixedVersion;
      pkg["overrides"] = overrides;
      modified = true;
    }

    const modifiedContent = JSON.stringify(pkg, null, 2) + "\n";
    const diff = generateUnifiedDiff("package.json", originalContent, modifiedContent);
    const bump = classifyVersionBump(dep.installedVersion, fixedVersion);

    return {
      findingFingerprints: [finding.fingerprint],
      title: `Upgrade ${depName} from ${dep.installedVersion} to ${fixedVersion}`,
      type: "auto-fix",
      rationale: `${finding.title}: upgrade ${depName} to ${fixedVersion} to resolve vulnerability.${finding.dependency?.advisoryUrl !== undefined && finding.dependency.advisoryUrl !== "" ? ` See: ${finding.dependency.advisoryUrl}` : ""}`,
      rollbackSteps: [
        "Revert package.json to the previous version",
        "Run `npm install` to restore the original dependency tree",
      ],
      fileChanges: [
        {
          filePath: "package.json",
          diff,
          changeType: "modify",
        },
      ],
      status: "pending",
      breakingRisk: breakingRiskFromBump(bump),
    };
  }
}
