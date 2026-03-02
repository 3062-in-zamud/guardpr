import { z } from "zod";
export declare const guardprYamlSchema: z.ZodObject<{
    confidenceThreshold: z.ZodDefault<z.ZodNumber>;
    createPr: z.ZodDefault<z.ZodBoolean>;
    runTests: z.ZodDefault<z.ZodBoolean>;
    testCommand: z.ZodDefault<z.ZodString>;
    scanners: z.ZodDefault<z.ZodObject<{
        secrets: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            maxTargetMegabytes: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            maxTargetMegabytes: number;
        }, {
            enabled?: boolean | undefined;
            maxTargetMegabytes?: number | undefined;
        }>>;
        dependencies: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
        }, {
            enabled?: boolean | undefined;
        }>>;
        xss: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            customSanitizers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            customSanitizers: string[];
        }, {
            enabled?: boolean | undefined;
            customSanitizers?: string[] | undefined;
        }>>;
        authz: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            protectedRoutes: z.ZodDefault<z.ZodArray<z.ZodObject<{
                pattern: z.ZodString;
                requiredMiddleware: z.ZodArray<z.ZodString, "many">;
            }, "strip", z.ZodTypeAny, {
                pattern: string;
                requiredMiddleware: string[];
            }, {
                pattern: string;
                requiredMiddleware: string[];
            }>, "many">>;
            authMiddleware: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            framework: z.ZodDefault<z.ZodEnum<["auto", "express", "nextjs"]>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            protectedRoutes: {
                pattern: string;
                requiredMiddleware: string[];
            }[];
            authMiddleware: string[];
            framework: "auto" | "express" | "nextjs";
        }, {
            enabled?: boolean | undefined;
            protectedRoutes?: {
                pattern: string;
                requiredMiddleware: string[];
            }[] | undefined;
            authMiddleware?: string[] | undefined;
            framework?: "auto" | "express" | "nextjs" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        secrets: {
            enabled: boolean;
            maxTargetMegabytes: number;
        };
        dependencies: {
            enabled: boolean;
        };
        xss: {
            enabled: boolean;
            customSanitizers: string[];
        };
        authz: {
            enabled: boolean;
            protectedRoutes: {
                pattern: string;
                requiredMiddleware: string[];
            }[];
            authMiddleware: string[];
            framework: "auto" | "express" | "nextjs";
        };
    }, {
        secrets?: {
            enabled?: boolean | undefined;
            maxTargetMegabytes?: number | undefined;
        } | undefined;
        dependencies?: {
            enabled?: boolean | undefined;
        } | undefined;
        xss?: {
            enabled?: boolean | undefined;
            customSanitizers?: string[] | undefined;
        } | undefined;
        authz?: {
            enabled?: boolean | undefined;
            protectedRoutes?: {
                pattern: string;
                requiredMiddleware: string[];
            }[] | undefined;
            authMiddleware?: string[] | undefined;
            framework?: "auto" | "express" | "nextjs" | undefined;
        } | undefined;
    }>>;
    patching: z.ZodDefault<z.ZodObject<{
        maxLinesPerPatch: z.ZodDefault<z.ZodNumber>;
        maxFilesPerPatch: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxLinesPerPatch: number;
        maxFilesPerPatch: number;
    }, {
        maxLinesPerPatch?: number | undefined;
        maxFilesPerPatch?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    scanners: {
        secrets: {
            enabled: boolean;
            maxTargetMegabytes: number;
        };
        dependencies: {
            enabled: boolean;
        };
        xss: {
            enabled: boolean;
            customSanitizers: string[];
        };
        authz: {
            enabled: boolean;
            protectedRoutes: {
                pattern: string;
                requiredMiddleware: string[];
            }[];
            authMiddleware: string[];
            framework: "auto" | "express" | "nextjs";
        };
    };
    confidenceThreshold: number;
    createPr: boolean;
    runTests: boolean;
    testCommand: string;
    patching: {
        maxLinesPerPatch: number;
        maxFilesPerPatch: number;
    };
}, {
    scanners?: {
        secrets?: {
            enabled?: boolean | undefined;
            maxTargetMegabytes?: number | undefined;
        } | undefined;
        dependencies?: {
            enabled?: boolean | undefined;
        } | undefined;
        xss?: {
            enabled?: boolean | undefined;
            customSanitizers?: string[] | undefined;
        } | undefined;
        authz?: {
            enabled?: boolean | undefined;
            protectedRoutes?: {
                pattern: string;
                requiredMiddleware: string[];
            }[] | undefined;
            authMiddleware?: string[] | undefined;
            framework?: "auto" | "express" | "nextjs" | undefined;
        } | undefined;
    } | undefined;
    confidenceThreshold?: number | undefined;
    createPr?: boolean | undefined;
    runTests?: boolean | undefined;
    testCommand?: string | undefined;
    patching?: {
        maxLinesPerPatch?: number | undefined;
        maxFilesPerPatch?: number | undefined;
    } | undefined;
}>;
export type GuardPRYamlInput = z.input<typeof guardprYamlSchema>;
//# sourceMappingURL=schema.d.ts.map