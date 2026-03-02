import * as fs from "fs";
import * as path from "path";

import { Patch } from "../types";
import { execCommand } from "../utils/exec";
import { info, warn } from "../utils/logger";

export class TestRunner {
  async runTests(patch: Patch, workDir: string, testCommand: string): Promise<Patch> {
    if (patch.type === "notification-only") {
      return { ...patch, status: "tests-skipped" };
    }

    if (patch.status === "generation-failed") {
      return patch;
    }

    const originalBranch = (
      await execCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: workDir })
    ).stdout.trim();

    const tempBranch = `guardpr-test-${Date.now()}`;

    try {
      // Create temp branch
      await execCommand("git", ["checkout", "-b", tempBranch], { cwd: workDir });

      // Apply patch diffs
      for (const change of patch.fileChanges) {
        const filePath = path.join(workDir, change.filePath);
        if (change.changeType === "delete") {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } else if (change.modifiedContent !== undefined) {
          // Direct file write — same as PR creation flow
          fs.writeFileSync(filePath, change.modifiedContent);
        } else if (change.diff) {
          // Fallback to git apply for patches without modifiedContent
          const tmpDiffFile = path.join(workDir, `.guardpr-patch-${Date.now()}.diff`);
          fs.writeFileSync(tmpDiffFile, change.diff);
          const applyResult = await execCommand("git", ["apply", "--allow-empty", tmpDiffFile], {
            cwd: workDir,
          });
          fs.unlinkSync(tmpDiffFile);
          if (applyResult.exitCode !== 0) {
            warn(`Failed to apply diff for ${change.filePath}: ${applyResult.stderr}`);
            return {
              ...patch,
              status: "tests-failed",
              testOutput: `Failed to apply patch: ${applyResult.stderr}`,
            };
          }
        }
      }

      // Run test command
      info(`Running tests: ${testCommand}`);
      const parts = testCommand.split(" ");
      const cmd = parts[0] ?? "npm";
      const args = parts.slice(1);
      const testResult = await execCommand(cmd, args, {
        cwd: workDir,
        timeout: 300_000, // 5 minute timeout
      });

      const testOutput = [testResult.stdout, testResult.stderr].filter(Boolean).join("\n");

      if (testResult.exitCode === 0) {
        return { ...patch, status: "tests-passed", testOutput };
      } else {
        return { ...patch, status: "tests-failed", testOutput };
      }
    } catch (err) {
      return {
        ...patch,
        status: "tests-failed",
        testOutput: `Test execution error: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      // Clean up: discard working tree changes, restore original branch, delete temp
      try {
        await execCommand("git", ["checkout", "--", "."], { cwd: workDir });
        await execCommand("git", ["clean", "-fd"], { cwd: workDir });
        await execCommand("git", ["checkout", originalBranch], { cwd: workDir });
        await execCommand("git", ["branch", "-D", tempBranch], { cwd: workDir });
      } catch {
        // Best effort cleanup
      }
    }
  }
}
