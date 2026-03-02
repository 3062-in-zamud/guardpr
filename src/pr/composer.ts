import { Finding, Patch } from "../types";

import { renderPRBody } from "./templates/pr-body";

export interface PRComposition {
  title: string;
  body: string;
  branchName: string;
  labels: string[];
}

export class PRComposer {
  compose(params: {
    findings: Finding[];
    lowConfidenceFindings: Finding[];
    patches: Patch[];
    context: { runId: number; sha: string; version: string };
  }): PRComposition {
    const { findings, lowConfidenceFindings, patches, context } = params;

    const totalCount = findings.length;
    const title = `fix(security): ${totalCount} vulnerabilit${totalCount === 1 ? "y" : "ies"} detected by GuardPR`;
    const branchName = `guardpr/fix-${context.runId}-${context.sha.slice(0, 8)}`;
    const body = renderPRBody({
      findings,
      lowConfidenceFindings,
      patches,
      runId: context.runId,
      sha: context.sha,
      version: context.version,
    });

    return {
      title,
      body,
      branchName,
      labels: ["guardpr"],
    };
  }
}
