import { execCommand } from "./exec";
import { info, warn } from "./logger";

export async function getCurrentSha(): Promise<string> {
  const result = await execCommand("git", ["rev-parse", "HEAD"]);
  return result.stdout.trim();
}

export async function getCurrentBranch(): Promise<string> {
  const result = await execCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return result.stdout.trim();
}

export async function createBranch(name: string): Promise<void> {
  await execCommand("git", ["checkout", "-b", name]);
}

export async function checkoutBranch(name: string): Promise<void> {
  await execCommand("git", ["checkout", name]);
}

export async function commitAll(message: string): Promise<void> {
  // Configure git user for CI environments
  await execCommand("git", ["config", "user.name", "guardpr[bot]"]);
  await execCommand("git", ["config", "user.email", "guardpr[bot]@users.noreply.github.com"]);

  const addResult = await execCommand("git", ["add", "-A"]);
  if (addResult.exitCode !== 0) {
    warn(`git add failed: ${addResult.stderr}`);
  }

  // Check if there are staged changes
  const statusResult = await execCommand("git", ["status", "--porcelain"]);
  info(`git status: ${statusResult.stdout.trim() || "(no changes)"}`);

  const commitResult = await execCommand("git", ["commit", "-m", message]);
  if (commitResult.exitCode !== 0) {
    warn(`git commit failed: ${commitResult.stderr || commitResult.stdout}`);
  }
}

export async function pushBranch(name: string, token: string): Promise<void> {
  const remoteUrl = (await execCommand("git", ["remote", "get-url", "origin"])).stdout.trim();
  const authedUrl = remoteUrl.replace("https://", `https://x-access-token:${token}@`);
  await execCommand("git", ["push", authedUrl, `HEAD:refs/heads/${name}`, "--force"]);
}

export async function getChangedFiles(baseSha: string): Promise<string[]> {
  const result = await execCommand("git", ["diff", "--name-only", baseSha, "HEAD"]);
  return result.stdout
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
}

export async function applyDiff(_diffContent: string): Promise<boolean> {
  const result = await execCommand("git", ["apply", "--check", "-"], {});
  if (result.exitCode !== 0) {
    return false;
  }
  const applyResult = await execCommand("git", ["apply", "-"]);
  return applyResult.exitCode === 0;
}
