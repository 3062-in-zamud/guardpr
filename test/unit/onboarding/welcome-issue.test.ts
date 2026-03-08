import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  hasOnboardingLabel,
  createIssue,
  ensureLabelExists,
  addLabel,
} from "../../../src/utils/github";
import { buildWelcomeIssueBody, runOnboarding } from "../../../src/onboarding/welcome-issue";
import { Finding } from "../../../src/types";

// Mock github utils
vi.mock("../../../src/utils/github", () => ({
  hasOnboardingLabel: vi.fn(),
  createIssue: vi.fn(),
  ensureLabelExists: vi.fn(),
  addLabel: vi.fn(),
}));

// Mock logger
vi.mock("../../../src/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
}));

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-test",
    scannerId: "gitleaks",
    category: "secrets",
    severity: "P0",
    title: "Test secret",
    description: "A test finding",
    location: { file: "src/config.ts", startLine: 10, endLine: 10 },
    codeSnippet: 'const key = "sk-xxx"',
    confidence: 0.95,
    confidenceFactors: [],
    ...overrides,
  };
}

describe("buildWelcomeIssueBody", () => {
  const baseParams = {
    owner: "owner",
    repo: "repo",
    token: "token",
    findings: { high: [], low: [] },
    prUrl: undefined,
    version: "1.1.0",
  };

  it("shows clean message when no findings", () => {
    const body = buildWelcomeIssueBody(baseParams);
    expect(body).toContain("no vulnerabilities");
    expect(body).toContain("✅ Secrets: 0 findings");
    expect(body).toContain("✅ Dependencies: 0 findings");
    expect(body).toContain("✅ XSS: 0 findings");
    expect(body).toContain("✅ Authorization: 0 findings");
  });

  it("shows finding counts per category", () => {
    const params = {
      ...baseParams,
      findings: {
        high: [makeFinding({ category: "secrets" }), makeFinding({ category: "xss" })],
        low: [makeFinding({ category: "dependencies" })],
      },
    };
    const body = buildWelcomeIssueBody(params);
    expect(body).toContain("⚠️ Secrets: 1 finding");
    expect(body).toContain("⚠️ XSS: 1 finding");
    expect(body).toContain("⚠️ Dependencies: 1 finding");
    expect(body).toContain("✅ Authorization: 0 findings");
  });

  it("includes PR URL in next steps when prUrl is provided", () => {
    const params = {
      ...baseParams,
      prUrl: "https://github.com/owner/repo/pull/42",
    };
    const body = buildWelcomeIssueBody(params);
    expect(body).toContain("https://github.com/owner/repo/pull/42");
    expect(body).toContain("Review and merge the auto-generated fix PR");
  });

  it("omits PR step when prUrl is undefined", () => {
    const body = buildWelcomeIssueBody(baseParams);
    expect(body).not.toContain("Review and merge the auto-generated fix PR");
  });

  it("includes version in heading", () => {
    const body = buildWelcomeIssueBody({ ...baseParams, version: "2.0.0" });
    expect(body).toContain("v2.0.0");
  });

  it("uses plural form for multiple findings", () => {
    const params = {
      ...baseParams,
      findings: {
        high: [
          makeFinding({ category: "secrets" }),
          makeFinding({ category: "secrets", fingerprint: "fp2" }),
        ],
        low: [],
      },
    };
    const body = buildWelcomeIssueBody(params);
    expect(body).toContain("⚠️ Secrets: 2 findings");
  });
});

describe("runOnboarding", () => {
  const params = {
    owner: "owner",
    repo: "repo",
    token: "token",
    findings: { high: [], low: [] },
    prUrl: undefined,
    version: "1.1.0",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when already onboarded", async () => {
    vi.mocked(hasOnboardingLabel).mockResolvedValue(true);

    await runOnboarding(params);

    expect(createIssue).not.toHaveBeenCalled();
  });

  it("creates welcome issue on first run", async () => {
    vi.mocked(hasOnboardingLabel).mockResolvedValue(false);
    vi.mocked(ensureLabelExists).mockResolvedValue(undefined);
    vi.mocked(createIssue).mockResolvedValue({
      url: "https://github.com/owner/repo/issues/1",
      number: 1,
    });
    vi.mocked(addLabel).mockResolvedValue(undefined);

    await runOnboarding(params);

    expect(ensureLabelExists).toHaveBeenCalledWith(
      "owner",
      "repo",
      "guardpr-onboarded",
      expect.any(String),
      expect.any(String),
      "token",
    );
    expect(createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "owner",
        repo: "repo",
        title: expect.stringContaining("GuardPR"),
        labels: ["guardpr-onboarded"],
      }),
    );
    expect(addLabel).toHaveBeenCalledWith("owner", "repo", 1, "guardpr-onboarded", "token");
  });

  it("does not throw when createIssue fails (non-fatal)", async () => {
    vi.mocked(hasOnboardingLabel).mockResolvedValue(false);
    vi.mocked(ensureLabelExists).mockResolvedValue(undefined);
    vi.mocked(createIssue).mockRejectedValue(new Error("API error"));

    await expect(runOnboarding(params)).resolves.not.toThrow();
  });
});
