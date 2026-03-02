import type { GuardPRConfig, ScanResult } from "../types";
import { MaskingLayer } from "../utils/masking";
import { ScannerRegistry } from "./registry";
export interface RunnerOptions {
    timeoutMs: number;
    enabledScanners: string[];
}
export declare const DEFAULT_RUNNER_OPTIONS: RunnerOptions;
export declare class ScannerRunner {
    private registry;
    private maskingLayer;
    constructor(registry: ScannerRegistry, maskingLayer: MaskingLayer);
    runAll(workDir: string, config: GuardPRConfig, options?: RunnerOptions): Promise<ScanResult[]>;
    private filterScanners;
    private runSingleScanner;
}
//# sourceMappingURL=runner.d.ts.map