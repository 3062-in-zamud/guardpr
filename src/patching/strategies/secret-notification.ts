import { Finding, Patch } from "../../types";

const ROTATION_INSTRUCTIONS: Record<string, string> = {
  "aws-access-key":
    "1. Go to AWS IAM Console\n2. Create a new access key\n3. Update all services using the old key\n4. Deactivate and delete the old key",
  "aws-secret-key":
    "1. Go to AWS IAM Console\n2. Create a new access key pair\n3. Update all services using the old key\n4. Deactivate and delete the old key",
  "github-pat":
    "1. Go to GitHub Settings > Developer settings > Personal access tokens\n2. Revoke the compromised token\n3. Generate a new token with the same scopes\n4. Update all services using the old token",
  "github-token":
    "1. Go to GitHub Settings > Developer settings > Personal access tokens\n2. Revoke the compromised token\n3. Generate a new token with the same scopes",
  "slack-token":
    "1. Go to Slack API > Your Apps\n2. Regenerate the compromised token\n3. Update all integrations using the old token",
  "stripe-key":
    "1. Go to Stripe Dashboard > Developers > API Keys\n2. Roll the compromised key\n3. Update all services using the old key",
  "private-key":
    "1. Generate a new key pair\n2. Update all services using the old key\n3. Revoke any certificates signed with the old key",
  "gcp-api-key":
    "1. Go to Google Cloud Console > APIs & Services > Credentials\n2. Delete the compromised key\n3. Create a new API key with the same restrictions",
};

function getRotationInstructions(finding: Finding): string {
  const ruleId = finding.secretRuleId ?? "";
  for (const [key, instructions] of Object.entries(ROTATION_INSTRUCTIONS)) {
    if (ruleId.toLowerCase().includes(key)) {
      return instructions;
    }
  }
  return "1. Identify all services using this secret\n2. Generate a new secret\n3. Update all services\n4. Revoke the old secret";
}

export class SecretNotificationStrategy {
  generate(findings: Finding[]): Patch {
    const summaryLines = findings.map((f, i) => {
      const rotation = getRotationInstructions(f);
      return `${i + 1}. **${f.title}** in \`${f.location.file}:${f.location.startLine}\`\n   Rule: ${f.secretRuleId ?? "unknown"}\n   Rotation steps:\n   ${rotation.replace(/\n/g, "\n   ")}`;
    });

    const rationale = [
      `${findings.length} secret(s) detected that require manual rotation.`,
      "Secrets cannot be automatically fixed — they must be rotated and the old values revoked.",
      "",
      ...summaryLines,
    ].join("\n");

    return {
      findingFingerprints: findings.map((f) => f.fingerprint),
      title: `Secret${findings.length > 1 ? "s" : ""} detected — manual rotation required`,
      type: "notification-only",
      rationale,
      rollbackSteps: ["N/A — notification only, no code changes were made"],
      fileChanges: [],
      status: "tests-skipped",
      breakingRisk: "none",
    };
  }
}
