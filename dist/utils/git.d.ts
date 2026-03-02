export declare function getCurrentSha(): Promise<string>;
export declare function getCurrentBranch(): Promise<string>;
export declare function createBranch(name: string): Promise<void>;
export declare function checkoutBranch(name: string): Promise<void>;
export declare function commitAll(message: string): Promise<void>;
export declare function pushBranch(name: string, token: string): Promise<void>;
export declare function getChangedFiles(baseSha: string): Promise<string[]>;
export declare function applyDiff(_diffContent: string): Promise<boolean>;
//# sourceMappingURL=git.d.ts.map