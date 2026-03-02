import { describe, it, expect, vi, beforeEach } from "vitest";
import * as actionsExec from "@actions/exec";

import { execCommand } from "../../../src/utils/exec";
import { GuardPRError } from "../../../src/types/errors";

vi.mock("@actions/exec", () => ({
  exec: vi.fn(),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("execCommand", () => {
  it("captures stdout and stderr", async () => {
    vi.mocked(actionsExec.exec).mockImplementation(async (_cmd, _args, options) => {
      options?.listeners?.stdout?.(Buffer.from("hello output"));
      options?.listeners?.stderr?.(Buffer.from("some warning"));
      return 0;
    });

    const result = await execCommand("echo", ["hello"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("hello output");
    expect(result.stderr).toBe("some warning");
  });

  it("returns non-zero exit code without throwing", async () => {
    vi.mocked(actionsExec.exec).mockImplementation(async (_cmd, _args, options) => {
      options?.listeners?.stderr?.(Buffer.from("command failed"));
      return 1;
    });

    const result = await execCommand("false", []);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("command failed");
  });

  it("passes cwd and env to exec", async () => {
    vi.mocked(actionsExec.exec).mockImplementation(async (_cmd, _args, options) => {
      expect(options?.cwd).toBe("/tmp");
      expect(options?.env).toEqual(expect.objectContaining({ MY_VAR: "value" }));
      return 0;
    });

    await execCommand("ls", [], { cwd: "/tmp", env: { MY_VAR: "value" } });

    expect(actionsExec.exec).toHaveBeenCalled();
  });

  it("throws GuardPRError on timeout", async () => {
    vi.mocked(actionsExec.exec).mockImplementation(async () => {
      // Simulate a long-running process
      return new Promise((resolve) => {
        setTimeout(() => resolve(0), 10000);
      });
    });

    await expect(execCommand("sleep", ["100"], { timeout: 50 })).rejects.toThrow(GuardPRError);

    await expect(execCommand("sleep", ["100"], { timeout: 50 })).rejects.toMatchObject({
      code: "SCANNER_TIMEOUT",
    });
  });

  it("defaults to silent mode", async () => {
    vi.mocked(actionsExec.exec).mockImplementation(async (_cmd, _args, options) => {
      expect(options?.silent).toBe(true);
      return 0;
    });

    await execCommand("echo", ["test"]);
  });

  it("respects silent: false option", async () => {
    vi.mocked(actionsExec.exec).mockImplementation(async (_cmd, _args, options) => {
      expect(options?.silent).toBe(false);
      return 0;
    });

    await execCommand("echo", ["test"], { silent: false });
  });
});
