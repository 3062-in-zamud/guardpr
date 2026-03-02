import { AnnotationProperties } from "@actions/core";
export declare function startGroup(name: string): void;
export declare function endGroup(): void;
export declare function info(msg: string): void;
export declare function warn(msg: string, properties?: AnnotationProperties): void;
export declare function error(msg: string): void;
export declare function debug(msg: string): void;
export declare function writeSummary(markdown: string): Promise<void>;
//# sourceMappingURL=logger.d.ts.map