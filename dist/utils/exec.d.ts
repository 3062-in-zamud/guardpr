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
export declare function execCommand(cmd: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
//# sourceMappingURL=exec.d.ts.map