import * as github from "@actions/github";
type Octokit = ReturnType<typeof github.getOctokit>;
export declare function getOctokit(token: string): Octokit;
export interface CreateDraftPRParams {
    owner: string;
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    token: string;
}
export declare function createDraftPR(params: CreateDraftPRParams): Promise<{
    url: string;
    number: number;
}>;
export declare function findExistingGuardPRs(owner: string, repo: string, token: string): Promise<{
    number: number;
    fingerprints: string[];
}[]>;
export declare function addLabel(owner: string, repo: string, prNumber: number, label: string, token: string): Promise<void>;
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
export declare function getContext(): GitHubContext;
export {};
//# sourceMappingURL=github.d.ts.map