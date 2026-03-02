import type { DetectionCategory, ScannerPlugin } from "../types";
export declare class ScannerRegistry {
    private scanners;
    register(scanner: ScannerPlugin): void;
    get(id: string): ScannerPlugin | undefined;
    getAll(): ScannerPlugin[];
    getByCategory(category: DetectionCategory): ScannerPlugin[];
}
//# sourceMappingURL=registry.d.ts.map