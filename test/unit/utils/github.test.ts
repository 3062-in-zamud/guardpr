import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import * as github from "@actions/github";

import {
  createDraftPR,
  findExistingGuardPRs,
  addLabel,
  getContext,
} from "../../../src/utils/github";

interface MockOctokit {
  rest: {
    pulls: { create: Mock; list: Mock };
    issues: { addLabels: Mock; createLabel: Mock };
  };
}

vi.mock("@actions/github", () => {
  const mockOctokit = {
    rest: {
      pulls: {
        create: vi.fn(),
        list: vi.fn(),
      },
      issues: {
        addLabels: vi.fn(),
        createLabel: vi.fn(),
      },
    },
  };
  return {
    getOctokit: vi.fn(() => mockOctokit),
    context: {
      repo: { owner: "test-owner", repo: "test-repo" },
      sha: "abc123",
      ref: "refs/heads/main",
      actor: "test-user",
      runId: 12345,
      eventName: "push",
      payload: {},
    },
  };
});

function getMockOctokit(): MockOctokit {
  return (github.getOctokit as Mock)("fake") as MockOctokit;
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Re-setup the mock return since restoreAllMocks clears it
  const mockOctokit = {
    rest: {
      pulls: {
        create: vi.fn(),
        list: vi.fn(),
      },
      issues: {
        addLabels: vi.fn(),
        createLabel: vi.fn(),
      },
    },
  };
  vi.mocked(github.getOctokit).mockReturnValue(mockOctokit as MockOctokit);
});

describe("createDraftPR", () => {
  it("creates a draft PR and returns url and number", async () => {
    const octokit = getMockOctokit();
    octokit.rest.pulls.create.mockResolvedValue({
      data: { html_url: "https://github.com/owner/repo/pull/42", number: 42 },
    });

    const result = await createDraftPR({
      owner: "owner",
      repo: "repo",
      title: "fix: security patch",
      body: "Automated fix",
      head: "guardpr/fix-abc",
      base: "main",
      token: "fake-token",
    });

    expect(result.url).toBe("https://github.com/owner/repo/pull/42");
    expect(result.number).toBe(42);
    expect(octokit.rest.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "owner",
        repo: "repo",
        draft: true,
      }),
    );
  });
});

describe("findExistingGuardPRs", () => {
  it("returns PRs with guardpr/ branch prefix and extracts fingerprints", async () => {
    const octokit = getMockOctokit();
    octokit.rest.pulls.list.mockResolvedValue({
      data: [
        {
          number: 10,
          head: { ref: "guardpr/fix-abc" },
          body: "<!-- guardpr-fingerprints:fp1,fp2 -->",
        },
        {
          number: 11,
          head: { ref: "feature/unrelated" },
          body: "some PR",
        },
        {
          number: 12,
          head: { ref: "guardpr/fix-def" },
          body: "No fingerprints here",
        },
      ],
    });

    const result = await findExistingGuardPRs("owner", "repo", "fake-token");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ number: 10, fingerprints: ["fp1", "fp2"] });
    expect(result[1]).toEqual({ number: 12, fingerprints: [] });
  });

  it("handles empty PR list", async () => {
    const octokit = getMockOctokit();
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });

    const result = await findExistingGuardPRs("owner", "repo", "fake-token");

    expect(result).toHaveLength(0);
  });
});

describe("addLabel", () => {
  it("adds a label to a PR", async () => {
    const octokit = getMockOctokit();
    octokit.rest.issues.addLabels.mockResolvedValue({});

    await addLabel("owner", "repo", 42, "security", "fake-token");

    expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      issue_number: 42,
      labels: ["security"],
    });
  });

  it("creates label and retries when addLabels fails", async () => {
    const octokit = getMockOctokit();
    octokit.rest.issues.addLabels
      .mockRejectedValueOnce(new Error("Not found"))
      .mockResolvedValueOnce({});
    octokit.rest.issues.createLabel.mockResolvedValue({});

    await addLabel("owner", "repo", 42, "security", "fake-token");

    expect(octokit.rest.issues.createLabel).toHaveBeenCalled();
    expect(octokit.rest.issues.addLabels).toHaveBeenCalledTimes(2);
  });
});

describe("getContext", () => {
  it("returns GitHub context info", () => {
    const ctx = getContext();

    expect(ctx.owner).toBe("test-owner");
    expect(ctx.repo).toBe("test-repo");
    expect(ctx.sha).toBe("abc123");
    expect(ctx.ref).toBe("refs/heads/main");
    expect(ctx.actor).toBe("test-user");
    expect(ctx.eventName).toBe("push");
  });

  it("returns undefined prNumber when not a PR event", () => {
    const ctx = getContext();
    expect(ctx.prNumber).toBeUndefined();
  });
});
