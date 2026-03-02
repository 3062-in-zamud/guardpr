import * as github from "@actions/github";

type Octokit = ReturnType<typeof github.getOctokit>;

export function getOctokit(token: string): Octokit {
  return github.getOctokit(token);
}

export interface CreateDraftPRParams {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  token: string;
}

export async function createDraftPR(
  params: CreateDraftPRParams,
): Promise<{ url: string; number: number }> {
  const octokit = getOctokit(params.token);
  const response = await octokit.rest.pulls.create({
    owner: params.owner,
    repo: params.repo,
    title: params.title,
    body: params.body,
    head: params.head,
    base: params.base,
    draft: true,
  });
  return { url: response.data.html_url, number: response.data.number };
}

export async function findExistingGuardPRs(
  owner: string,
  repo: string,
  token: string,
): Promise<{ number: number; fingerprints: string[] }[]> {
  const octokit = getOctokit(token);
  const { data: pulls } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:guardpr/`,
    per_page: 100,
  });

  return pulls
    .filter((pr) => pr.head.ref.startsWith("guardpr/"))
    .map((pr) => {
      const fingerprints: string[] = [];
      const body = pr.body ?? "";
      const match = /<!-- guardpr-fingerprints:(.*?) -->/.exec(body);
      if (match?.[1] !== undefined) {
        fingerprints.push(
          ...match[1]
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f.length > 0),
        );
      }
      return { number: pr.number, fingerprints };
    });
}

export async function addLabel(
  owner: string,
  repo: string,
  prNumber: number,
  label: string,
  token: string,
): Promise<void> {
  const octokit = getOctokit(token);
  try {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: [label],
    });
  } catch {
    // Label may not exist; try creating it first
    try {
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name: label,
        color: "d73a4a",
        description: "GuardPR security finding",
      });
      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels: [label],
      });
    } catch {
      // Best-effort: label creation may fail due to permissions
    }
  }
}

export interface GitHubContext {
  owner: string;
  repo: string;
  sha: string;
  ref: string;
  actor: string;
  runId: number;
  runAttempt: number;
  eventName: string;
  prNumber?: number;
}

export function getContext(): GitHubContext {
  const { owner, repo } = github.context.repo;
  const prNumber = github.context.payload.pull_request?.number;

  return {
    owner,
    repo,
    sha: github.context.sha,
    ref: github.context.ref,
    actor: github.context.actor,
    runId: github.context.runId,
    runAttempt: parseInt(process.env["GITHUB_RUN_ATTEMPT"] ?? "1", 10),
    eventName: github.context.eventName,
    prNumber,
  };
}
