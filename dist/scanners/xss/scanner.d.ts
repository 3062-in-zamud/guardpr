import { GuardPRConfig } from "../../types/config";
import { Finding } from "../../types/finding";
import { ScannerPlugin } from "../../types/scanner";
export declare class XssScanner implements ScannerPlugin {
    readonly id = "xss";
    readonly name = "XSS Detector";
    readonly category: "xss";
    readonly defaultSeverity: "P1";
    isAvailable(_workDir: string): Promise<boolean>;
    scan(workDir: string, config: GuardPRConfig): Promise<Finding[]>;
}
//# sourceMappingURL=scanner.d.ts.map