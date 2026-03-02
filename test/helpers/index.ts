import {
  Finding,
  GuardPRConfig,
  ScanResult,
  Patch,
  DetectionCategory,
  Severity,
  ScanResultStatus,
  PatchType,
  PatchStatus,
  BreakingRisk,
} from "../../src/types";

export function createMockFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "abc123def456",
    scannerId: "test-scanner",
    category: "xss" as DetectionCategory,
    severity: "P1" as Severity,
    cwe: "CWE-79",
    title: "Test XSS Finding",
    description: "A test finding for XSS vulnerability",
    location: {
      file: "src/app.tsx",
      startLine: 10,
      endLine: 10,
    },
    codeSnippet: "dangerouslySetInnerHTML={{ __html: userInput }}",
    confidence: 0.85,
    confidenceFactors: [
      { name: "user-input-detected", score: 0.85, reason: "User input pattern found" },
    ],
    ...overrides,
  };
}

export function createMockConfig(overrides: Partial<GuardPRConfig> = {}): GuardPRConfig {
  return {
    configPath: ".guardpr.yml",
    confidenceThreshold: 0.9,
    createPr: true,
    runTests: true,
    testCommand: "npm test",
    scanners: {
      secrets: { enabled: true, maxTargetMegabytes: 10 },
      dependencies: { enabled: true },
      xss: { enabled: true, customSanitizers: [] },
      authz: {
        enabled: true,
        protectedRoutes: [],
        authMiddleware: ["isAuthenticated", "isAdmin", "requireAuth"],
        framework: "auto",
      },
    },
    patching: {
      maxLinesPerPatch: 50,
      maxFilesPerPatch: 5,
    },
    githubToken: "ghp_test_token_000000000000000000000000",
    ...overrides,
  };
}

export function createMockScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    scannerId: "test-scanner",
    status: "success" as ScanResultStatus,
    findings: [],
    durationMs: 1500,
    exitCode: 0,
    ...overrides,
  };
}

export function createMockPatch(overrides: Partial<Patch> = {}): Patch {
  return {
    findingFingerprints: ["abc123"],
    title: "Fix XSS vulnerability",
    type: "auto-fix" as PatchType,
    rationale: "Wrapped user input with DOMPurify.sanitize()",
    rollbackSteps: ["Revert the changes to src/app.tsx"],
    fileChanges: [
      {
        filePath: "src/app.tsx",
        diff: "--- a/src/app.tsx\n+++ b/src/app.tsx\n@@ -10,1 +10,1 @@\n-dangerouslySetInnerHTML={{ __html: userInput }}\n+dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }}",
        changeType: "modify",
      },
    ],
    status: "pending" as PatchStatus,
    breakingRisk: "none" as BreakingRisk,
    ...overrides,
  };
}

export function createSecretFinding(overrides: Partial<Finding> = {}): Finding {
  return createMockFinding({
    scannerId: "gitleaks",
    category: "secrets",
    severity: "P0",
    title: "AWS Access Key detected",
    secretRuleId: "aws-access-key",
    codeSnippet: "const key = AKIA****MPLE",
    confidence: 0.92,
    ...overrides,
  });
}

export function createDependencyFinding(overrides: Partial<Finding> = {}): Finding {
  return createMockFinding({
    scannerId: "osv-scanner",
    category: "dependencies",
    severity: "P1",
    title: "lodash prototype pollution",
    cwe: "CWE-1321",
    dependency: {
      name: "lodash",
      ecosystem: "npm",
      installedVersion: "4.17.20",
      fixedVersion: "4.17.21",
      advisoryUrl: "https://github.com/advisories/GHSA-jf85-cpcp-j695",
    },
    confidence: 0.88,
    ...overrides,
  });
}

export function createAuthzFinding(overrides: Partial<Finding> = {}): Finding {
  return createMockFinding({
    scannerId: "authz",
    category: "authz",
    severity: "P0",
    cwe: "CWE-862",
    title: "Missing authorization middleware on GET /api/admin/users",
    confidence: 0.95,
    ...overrides,
  });
}
