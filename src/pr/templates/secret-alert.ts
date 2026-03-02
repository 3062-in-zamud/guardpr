import { Finding } from "../../types";

const ROTATION_ACTIONS: Record<string, string> = {
  "aws-access-key": "Rotate in AWS IAM Console",
  "aws-secret-key": "Rotate in AWS IAM Console",
  "github-pat": "Revoke in GitHub Settings > Developer settings",
  "github-token": "Revoke in GitHub Settings > Developer settings",
  "slack-token": "Regenerate in Slack API Dashboard",
  "stripe-key": "Roll in Stripe Dashboard > API Keys",
  "private-key": "Generate new key pair, revoke certificates",
  "gcp-api-key": "Rotate in Google Cloud Console > Credentials",
};

function getActionRequired(finding: Finding): string {
  const ruleId = finding.secretRuleId ?? "";
  for (const [key, action] of Object.entries(ROTATION_ACTIONS)) {
    if (ruleId.toLowerCase().includes(key)) {
      return action;
    }
  }
  return "Rotate secret and revoke old value";
}

export function renderSecretAlert(findings: Finding[]): string {
  if (findings.length === 0) {
    return "";
  }

  const lines: string[] = [];

  lines.push("### :warning: Secrets Detected (Manual Action Required)");
  lines.push("");
  lines.push("> The actual secret value is NOT included in this PR for security reasons.");
  lines.push("");
  lines.push("| # | Type | File | Line | Action Required |");
  lines.push("|---|------|------|------|-----------------|");

  findings.forEach((finding, index) => {
    const type = finding.secretRuleId ?? finding.title;
    const file = finding.location.file;
    const line = finding.location.startLine;
    const action = getActionRequired(finding);
    lines.push(`| ${index + 1} | ${type} | \`${file}\` | ${line} | ${action} |`);
  });

  lines.push("");
  return lines.join("\n");
}
