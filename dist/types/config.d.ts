export interface AuthzProtectedRoute {
    pattern: string;
    requiredMiddleware: string[];
}
export interface AuthzScannerConfig {
    enabled: boolean;
    protectedRoutes: AuthzProtectedRoute[];
    authMiddleware: string[];
    framework: "auto" | "express" | "nextjs";
}
export interface XssScannerConfig {
    enabled: boolean;
    customSanitizers: string[];
}
export interface SecretsScannerConfig {
    enabled: boolean;
    maxTargetMegabytes: number;
}
export interface DependencyScannerConfig {
    enabled: boolean;
}
export interface ScannersConfig {
    secrets: SecretsScannerConfig;
    dependencies: DependencyScannerConfig;
    xss: XssScannerConfig;
    authz: AuthzScannerConfig;
}
export interface PatchingConfig {
    maxLinesPerPatch: number;
    maxFilesPerPatch: number;
}
export interface GuardPRConfig {
    configPath: string;
    confidenceThreshold: number;
    createPr: boolean;
    runTests: boolean;
    testCommand: string;
    scanners: ScannersConfig;
    patching: PatchingConfig;
    githubToken: string;
}
//# sourceMappingURL=config.d.ts.map