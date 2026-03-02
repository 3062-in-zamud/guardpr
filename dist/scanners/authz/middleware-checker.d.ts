import { AuthzScannerConfig } from "../../types/config";
import { RouteDefinition } from "./framework-adapters";
export interface AuthzViolation {
    route: RouteDefinition;
    expectedMiddleware: string[];
    missingMiddleware: string[];
    confidence: number;
}
export declare function checkMiddleware(routes: RouteDefinition[], config: AuthzScannerConfig): AuthzViolation[];
//# sourceMappingURL=middleware-checker.d.ts.map