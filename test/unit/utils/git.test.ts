import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getCurrentSha,
  getCurrentBranch,
  createBranch,
  checkoutBranch,
  commitAll,
  pushBranch,
  getChangedFiles,
  applyDiff,
} from "../../../src/utils/git";
import { execCommand } from "../../../src/utils/exec";

vi.mock("../../../src/utils/exec", () => ({
  execCommand: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("git utilities", () => {
  describe("getCurrentSha", () => {
    it("returns trimmed SHA from git rev-parse", async () => {
      vi.mocked(execCommand).mockResolvedValue({
        exitCode: 0,
        stdout: "abc123def456\n",
        stderr: "",
      });

      const sha = await getCurrentSha();

      expect(sha).toBe("abc123def456");
      expect(execCommand).toHaveBeenCalledWith("git", ["rev-parse", "HEAD"]);
    });
  });

  describe("getCurrentBranch", () => {
    it("returns trimmed branch name", async () => {
      vi.mocked(execCommand).mockResolvedValue({
        exitCode: 0,
        stdout: "main\n",
        stderr: "",
      });

      const branch = await getCurrentBranch();

      expect(branch).toBe("main");
      expect(execCommand).toHaveBeenCalledWith("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    });
  });

  describe("createBranch", () => {
    it("creates a new branch with checkout -b", async () => {
      vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

      await createBranch("guardpr/fix-123");

      expect(execCommand).toHaveBeenCalledWith("git", ["checkout", "-b", "guardpr/fix-123"]);
    });
  });

  describe("checkoutBranch", () => {
    it("checks out an existing branch", async () => {
      vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

      await checkoutBranch("main");

      expect(execCommand).toHaveBeenCalledWith("git", ["checkout", "main"]);
    });
  });

  describe("commitAll", () => {
    it("stages all files and commits", async () => {
      vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

      await commitAll("fix: patch vulnerability");

      expect(execCommand).toHaveBeenCalledWith("git", ["add", "-A"]);
      expect(execCommand).toHaveBeenCalledWith("git", ["commit", "-m", "fix: patch vulnerability"]);
    });
  });

  describe("pushBranch", () => {
    it("pushes with authenticated remote URL", async () => {
      vi.mocked(execCommand)
        .mockResolvedValueOnce({
          exitCode: 0,
          stdout: "https://github.com/owner/repo.git\n",
          stderr: "",
        })
        .mockResolvedValueOnce({ exitCode: 0, stdout: "", stderr: "" });

      await pushBranch("guardpr/fix-123", "my-token");

      expect(execCommand).toHaveBeenCalledWith("git", ["remote", "get-url", "origin"]);
      expect(execCommand).toHaveBeenCalledWith("git", [
        "push",
        "https://x-access-token:my-token@github.com/owner/repo.git",
        "HEAD:refs/heads/guardpr/fix-123",
        "--force",
      ]);
    });
  });

  describe("getChangedFiles", () => {
    it("returns list of changed files", async () => {
      vi.mocked(execCommand).mockResolvedValue({
        exitCode: 0,
        stdout: "src/index.ts\nsrc/utils.ts\n",
        stderr: "",
      });

      const files = await getChangedFiles("abc123");

      expect(files).toEqual(["src/index.ts", "src/utils.ts"]);
      expect(execCommand).toHaveBeenCalledWith("git", ["diff", "--name-only", "abc123", "HEAD"]);
    });

    it("returns empty array for no changes", async () => {
      vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "\n", stderr: "" });

      const files = await getChangedFiles("abc123");

      expect(files).toEqual([]);
    });
  });

  describe("applyDiff", () => {
    it("returns true when diff applies successfully", async () => {
      vi.mocked(execCommand).mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

      const result = await applyDiff("diff content");

      expect(result).toBe(true);
    });

    it("returns false when dry-run check fails", async () => {
      vi.mocked(execCommand).mockResolvedValueOnce({
        exitCode: 1,
        stdout: "",
        stderr: "patch does not apply",
      });

      const result = await applyDiff("bad diff");

      expect(result).toBe(false);
    });
  });
});
