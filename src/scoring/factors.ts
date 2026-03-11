import { ConfidenceFactor, DetectionCategory, Finding } from "../types";

export interface FactorCalculator {
  calculate(finding: Finding): ConfidenceFactor[];
}

function calculateEntropy(str: string): number {
  if (str.length === 0) {
    return 0;
  }
  const freq = new Map<string, number>();
  for (const c of str) {
    freq.set(c, (freq.get(c) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export class SecretsFactorCalculator implements FactorCalculator {
  calculate(finding: Finding): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // Entropy factor: 0 to 0.4
    const snippet = finding.codeSnippet;
    const valueMatch = /['"`]([^'"`]{8,})['"`]/.exec(snippet);
    const valueToCheck = valueMatch?.[1] ?? snippet;
    const entropy = calculateEntropy(valueToCheck);
    const maxEntropy = Math.log2(94); // printable ASCII
    const normalizedEntropy = Math.min(entropy / maxEntropy, 1);
    const entropyScore = normalizedEntropy * 0.4;
    factors.push({
      name: "entropy",
      score: entropyScore,
      reason: `Shannon entropy: ${entropy.toFixed(2)} bits (${(normalizedEntropy * 100).toFixed(0)}% of max)`,
    });

    // Rule specificity factor: 0 to 0.3
    const ruleId = finding.secretRuleId ?? "";
    const specificRules = [
      "aws-access-key",
      "aws-secret-key",
      "github-pat",
      "github-token",
      "slack-token",
      "stripe-key",
      "private-key",
      "gcp-api-key",
    ];
    const isSpecific = specificRules.some((r) => ruleId.toLowerCase().includes(r));
    const ruleScore = isSpecific ? 0.3 : 0.15;
    factors.push({
      name: "ruleSpecificity",
      score: ruleScore,
      reason: isSpecific
        ? `Specific rule matched: ${ruleId}`
        : `Generic rule matched: ${ruleId !== "" ? ruleId : "unknown"}`,
    });

    // Context deductions: +/- 0.3
    const filePath = finding.location.file;
    let contextScore = 0;
    const contextReasons: string[] = [];

    if (/\.(test|spec)\.[jt]sx?$/.test(filePath) || /\/__tests__\//.test(filePath)) {
      contextScore -= 0.25;
      contextReasons.push("test file (-0.25)");
    }

    if (/\.env\.example$/.test(filePath) || /\.env\.sample$/.test(filePath)) {
      contextScore -= 0.3;
      contextReasons.push(".env.example file (-0.3)");
    }

    const placeholders = [
      "PLACEHOLDER",
      "CHANGEME",
      "TODO",
      "REPLACE_ME",
      "your-",
      "xxx",
      "example",
      "<your",
    ];
    const snippetLower = snippet.toLowerCase();
    if (placeholders.some((p) => snippetLower.includes(p.toLowerCase()))) {
      contextScore -= 0.4;
      contextReasons.push("placeholder value (-0.4)");
    }

    // Check if in a comment
    const trimmedSnippet = snippet.trimStart();
    if (
      trimmedSnippet.startsWith("//") ||
      trimmedSnippet.startsWith("*") ||
      trimmedSnippet.startsWith("#")
    ) {
      contextScore -= 0.1;
      contextReasons.push("comment line (-0.1)");
    }

    if (contextReasons.length === 0) {
      contextReasons.push("no context deductions");
    }

    factors.push({
      name: "context",
      score: contextScore,
      reason: contextReasons.join(", "),
    });

    return factors;
  }
}

export class DependencyFactorCalculator implements FactorCalculator {
  calculate(finding: Finding): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];
    const dep = finding.dependency;

    if (
      dep === undefined ||
      dep === null ||
      dep.fixedVersion === undefined ||
      dep.fixedVersion === ""
    ) {
      factors.push({
        name: "fixAvailability",
        score: 0.05,
        reason: "No fix available — total confidence capped at 0.05",
      });
      return factors;
    }

    // CVSS factor: 0 to 0.5 based on severity
    const cvssMap: Record<string, number> = { P0: 0.5, P1: 0.35, P2: 0.2 };
    const cvssScore = cvssMap[finding.severity] ?? 0.2;
    factors.push({
      name: "cvss",
      score: cvssScore,
      reason: `Severity ${finding.severity} maps to ${cvssScore} CVSS factor`,
    });

    // Fix availability factor: 0 to 0.3
    const fixScore = 0.3;
    factors.push({
      name: "fixAvailability",
      score: fixScore,
      reason: `Fix available: upgrade to ${dep.fixedVersion}`,
    });

    // Direct vs indirect factor: 0 to 0.2
    const isDirect = !finding.title.toLowerCase().includes("indirect");
    const bumpType = classifyVersionBump(dep.installedVersion, dep.fixedVersion);
    let directScore = isDirect ? 0.2 : 0.1;
    if (bumpType === "major") {
      directScore *= 0.5;
    }
    factors.push({
      name: "directVsIndirect",
      score: directScore,
      reason: isDirect
        ? `Direct dependency, ${bumpType} version bump`
        : `Indirect dependency, ${bumpType} version bump`,
    });

    return factors;
  }
}

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

export class XssFactorCalculator implements FactorCalculator {
  calculate(finding: Finding): ConfidenceFactor[] {
    // Pass through confidence factors from the XSS scanner's context analysis
    if (finding.confidenceFactors.length > 0) {
      return finding.confidenceFactors;
    }
    return [
      {
        name: "xssAnalysis",
        score: finding.confidence,
        reason: "XSS confidence from scanner analysis",
      },
    ];
  }
}

export class AuthzFactorCalculator implements FactorCalculator {
  calculate(finding: Finding): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];
    const snippet = finding.codeSnippet;

    // Check for exact pattern match with clearly missing middleware
    const routePattern =
      /\.(get|post|put|delete|patch|all)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(async\s+)?(function|\(|[a-zA-Z])/;
    const hasExactMatch = routePattern.test(snippet);

    if (hasExactMatch) {
      factors.push({
        name: "patternMatch",
        score: 0.95,
        reason: "Exact route pattern match with clearly missing auth middleware",
      });
    } else {
      factors.push({
        name: "patternMatch",
        score: 0.7,
        reason: "Partial pattern match — route may have auth applied elsewhere",
      });
    }

    return factors;
  }
}

export class ExternalFactorCalculator implements FactorCalculator {
  calculate(_finding: Finding): ConfidenceFactor[] {
    return [
      {
        name: "externalTool",
        score: 0.95,
        reason: "External tool finding — default high confidence",
      },
    ];
  }
}

export function getFactorCalculator(category: DetectionCategory): FactorCalculator {
  switch (category) {
    case "secrets":
      return new SecretsFactorCalculator();
    case "dependencies":
      return new DependencyFactorCalculator();
    case "xss":
      return new XssFactorCalculator();
    case "authz":
      return new AuthzFactorCalculator();
    case "external":
      return new ExternalFactorCalculator();
    default:
      throw new Error(`Unknown category: ${category as string}`);
  }
}
