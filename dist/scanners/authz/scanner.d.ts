import { GuardPRConfig } from "../../types/config";
import { Finding } from "../../types/finding";
import { ScannerPlugin } from "../../types/scanner";
export declare class AuthzScanner implements ScannerPlugin {
    readonly id = "authz";
    readonly name = "Authorization Checker";
    readonly category: "authz";
    readonly defaultSeverity: "P0";
    isAvailable(_workDir: string): Promise<boolean>;
    scan(workDir: string, config: GuardPRConfig): Promise<Finding[]>;
}
//# sourceMappingURL=scanner.d.ts.map