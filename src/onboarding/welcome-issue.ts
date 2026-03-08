import { Finding, DetectionCategory } from "../types";
import { hasOnboardingLabel, createIssue, ensureLabelExists, addLabel } from "../utils/github";
import { info, warn } from "../utils/logger";

const ONBOARDING_LABEL = "guardpr-onboarded";
const ONBOARDING_LABEL_COLOR = "0075ca";
const ONBOARDING_LABEL_DESCRIPTION = "Repository has completed GuardPR onboarding";

export interface OnboardingParams {
  owner: string;
  repo: string;
  token: string;
  findings: {
    high: Finding[];
    low: Finding[];
  };
  prUrl: string | undefined;
  version: string;
}

interface CategoryCounts {
  secrets: number;
  dependencies: number;
  xss: number;
  authz: number;
}

function countByCategory(findings: Finding[]): CategoryCounts {
  const counts: CategoryCounts = { secrets: 0, dependencies: 0, xss: 0, authz: 0 };
  for (const f of findings) {
    counts[f.category] += 1;
  }
  return counts;
}

function categoryLabel(category: DetectionCategory): string {
  const labels: Record<DetectionCategory, string> = {
    secrets: "Secrets",
    dependencies: "Dependencies",
    xss: "XSS",
    authz: "Authorization",
  };
  return labels[category];
}

export function buildWelcomeIssueBody(params: OnboardingParams): string {
  const all = [...params.findings.high, ...params.findings.low];
  const counts = countByCategory(all);
  const categories: DetectionCategory[] = ["secrets", "dependencies", "xss", "authz"];

  const scanLines = categories.map((cat) => {
    const count = counts[cat];
    const label = categoryLabel(cat);
    if (count === 0) {
      return `- ✅ ${label}: 0 findings`;
    }
    return `- ⚠️ ${label}: ${count} finding${count > 1 ? "s" : ""}`;
  });

  const totalFindings = all.length;
  const hasFindings = totalFindings > 0;

  const nextSteps: string[] = [];
  if (params.prUrl !== undefined) {
    nextSteps.push(`- [ ] [Review and merge the auto-generated fix PR](${params.prUrl})`);
  }
  nextSteps.push("- [ ] Adjust detection thresholds in `.guardpr.yml` if needed");
  nextSteps.push(
    "- [ ] Explore the [configuration docs](https://github.com/ren0826nosuke/guardpr/blob/main/docs/configuration.md)",
  );
  nextSteps.push(
    "- [ ] Join [GitHub Discussions](https://github.com/ren0826nosuke/guardpr/discussions) for questions and feedback",
  );

  const headline = hasFindings
    ? `GuardPR found **${totalFindings} security issue${totalFindings > 1 ? "s" : ""}** and has created a fix PR automatically.`
    : `GuardPR scanned your repository and found **no vulnerabilities**. Your codebase looks clean! 🎉`;

  const lines = [
    `## 🛡️ Welcome to GuardPR v${params.version}`,
    "",
    headline,
    "",
    "---",
    "",
    "## Scan Results",
    "",
    ...scanLines,
    "",
    "---",
    "",
    "## Next Steps",
    "",
    ...nextSteps,
    "",
    "---",
    "",
    "## About GuardPR",
    "",
    "GuardPR runs on every push and pull request, automatically scanning for:",
    "- **Secrets**: API keys, tokens, and credentials accidentally committed",
    "- **Dependencies**: Known CVEs in your `package.json` dependencies",
    "- **XSS**: Unsafe HTML injection patterns in your code",
    "- **Authorization**: Unprotected API routes missing auth middleware",
    "",
    "When vulnerabilities are found, GuardPR opens a draft PR with automated fixes.",
    "",
    "_This issue was automatically created by GuardPR on first run. You can close it once you've reviewed the steps above._",
  ];

  return lines.join("\n");
}

export async function runOnboarding(params: OnboardingParams): Promise<void> {
  try {
    const alreadyOnboarded = await hasOnboardingLabel(params.owner, params.repo, params.token);
    if (alreadyOnboarded) {
      info("GuardPR onboarding already completed, skipping welcome issue");
      return;
    }

    info("First run detected — creating welcome issue");

    await ensureLabelExists(
      params.owner,
      params.repo,
      ONBOARDING_LABEL,
      ONBOARDING_LABEL_COLOR,
      ONBOARDING_LABEL_DESCRIPTION,
      params.token,
    );

    const body = buildWelcomeIssueBody(params);
    const result = await createIssue({
      owner: params.owner,
      repo: params.repo,
      title: "🛡️ GuardPR is now protecting your repository",
      body,
      labels: [ONBOARDING_LABEL],
      token: params.token,
    });

    info(`Created welcome issue #${result.number}: ${result.url}`);

    // Tag the issue itself with the onboarding label to mark completion
    await addLabel(params.owner, params.repo, result.number, ONBOARDING_LABEL, params.token);
  } catch (err) {
    warn(
      `Onboarding welcome issue creation failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
