import * as actionsExec from "@actions/exec";

import { GuardPRError } from "../types/errors";

export interface ExecOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  silent?: boolean;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function execCommand(
  cmd: string,
  args: string[],
  options?: ExecOptions,
): Promise<ExecResult> {
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const execPromise = actionsExec
    .exec(cmd, args, {
      cwd: options?.cwd,
      env: options?.env as { [key: string]: string } | undefined,
      silent: options?.silent ?? true,
      ignoreReturnCode: true,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
      },
    })
    .then((exitCode) => ({ exitCode, stdout, stderr }));

  if (options?.timeout !== undefined && options.timeout > 0) {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(
          new GuardPRError(
            `Command timed out after ${options.timeout}ms: ${cmd} ${args.join(" ")}`,
            "SCANNER_TIMEOUT",
            true,
          ),
        );
      }, options.timeout);
    });

    try {
      const result = await Promise.race([execPromise, timeoutPromise]);
      return result;
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  if (timedOut) {
    throw new GuardPRError(`Command timed out: ${cmd} ${args.join(" ")}`, "SCANNER_TIMEOUT", true);
  }

  return execPromise;
}
