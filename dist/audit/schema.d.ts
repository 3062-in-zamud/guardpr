import { z } from "zod";
import { AuditLogEntry } from "../types";
export declare const auditLogSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    timestamp: z.ZodString;
    guardprVersion: z.ZodString;
    github: z.ZodObject<{
        repository: z.ZodString;
        sha: z.ZodString;
        ref: z.ZodString;
        actor: z.ZodString;
        runId: z.ZodNumber;
        runAttempt: z.ZodNumber;
        eventName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        repository: string;
        sha: string;
        ref: string;
        actor: string;
        runId: number;
        runAttempt: number;
        eventName: string;
    }, {
        repository: string;
        sha: string;
        ref: string;
        actor: string;
        runId: number;
        runAttempt: number;
        eventName: string;
    }>;
    toolVersions: z.ZodRecord<z.ZodString, z.ZodString>;
    rulesetHash: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    scanResults: z.ZodArray<z.ZodObject<{
        scannerId: z.ZodString;
        status: z.ZodEnum<["success", "partial", "failed", "skipped"]>;
        findings: z.ZodArray<z.ZodObject<{
            fingerprint: z.ZodString;
            scannerId: z.ZodString;
            category: z.ZodEnum<["secrets", "dependencies", "xss", "authz"]>;
            severity: z.ZodEnum<["P0", "P1", "P2"]>;
            cwe: z.ZodOptional<z.ZodString>;
            title: z.ZodString;
            description: z.ZodString;
            location: z.ZodObject<{
                file: z.ZodString;
                startLine: z.ZodNumber;
                endLine: z.ZodNumber;
                startColumn: z.ZodOptional<z.ZodNumber>;
                endColumn: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            }, {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            }>;
            codeSnippet: z.ZodString;
            confidence: z.ZodNumber;
            confidenceFactors: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                score: z.ZodNumber;
                reason: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                score: number;
                reason: string;
            }, {
                name: string;
                score: number;
                reason: string;
            }>, "many">;
            dependency: z.ZodOptional<z.ZodObject<{
                name: z.ZodString;
                ecosystem: z.ZodString;
                installedVersion: z.ZodString;
                fixedVersion: z.ZodOptional<z.ZodString>;
                advisoryUrl: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            }, {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            }>>;
            secretRuleId: z.ZodOptional<z.ZodString>;
            rawData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            scannerId: string;
            description: string;
            fingerprint: string;
            category: "secrets" | "dependencies" | "xss" | "authz";
            severity: "P0" | "P1" | "P2";
            location: {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            };
            codeSnippet: string;
            confidence: number;
            confidenceFactors: {
                name: string;
                score: number;
                reason: string;
            }[];
            cwe?: string | undefined;
            dependency?: {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            } | undefined;
            secretRuleId?: string | undefined;
            rawData?: Record<string, unknown> | undefined;
        }, {
            title: string;
            scannerId: string;
            description: string;
            fingerprint: string;
            category: "secrets" | "dependencies" | "xss" | "authz";
            severity: "P0" | "P1" | "P2";
            location: {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            };
            codeSnippet: string;
            confidence: number;
            confidenceFactors: {
                name: string;
                score: number;
                reason: string;
            }[];
            cwe?: string | undefined;
            dependency?: {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            } | undefined;
            secretRuleId?: string | undefined;
            rawData?: Record<string, unknown> | undefined;
        }>, "many">;
        durationMs: z.ZodNumber;
        exitCode: z.ZodNumber;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "success" | "partial" | "failed" | "skipped";
        findings: {
            title: string;
            scannerId: string;
            description: string;
            fingerprint: string;
            category: "secrets" | "dependencies" | "xss" | "authz";
            severity: "P0" | "P1" | "P2";
            location: {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            };
            codeSnippet: string;
            confidence: number;
            confidenceFactors: {
                name: string;
                score: number;
                reason: string;
            }[];
            cwe?: string | undefined;
            dependency?: {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            } | undefined;
            secretRuleId?: string | undefined;
            rawData?: Record<string, unknown> | undefined;
        }[];
        scannerId: string;
        durationMs: number;
        exitCode: number;
        error?: string | undefined;
    }, {
        status: "success" | "partial" | "failed" | "skipped";
        findings: {
            title: string;
            scannerId: string;
            description: string;
            fingerprint: string;
            category: "secrets" | "dependencies" | "xss" | "authz";
            severity: "P0" | "P1" | "P2";
            location: {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            };
            codeSnippet: string;
            confidence: number;
            confidenceFactors: {
                name: string;
                score: number;
                reason: string;
            }[];
            cwe?: string | undefined;
            dependency?: {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            } | undefined;
            secretRuleId?: string | undefined;
            rawData?: Record<string, unknown> | undefined;
        }[];
        scannerId: string;
        durationMs: number;
        exitCode: number;
        error?: string | undefined;
    }>, "many">;
    allFindings: z.ZodArray<z.ZodObject<{
        fingerprint: z.ZodString;
        scannerId: z.ZodString;
        category: z.ZodEnum<["secrets", "dependencies", "xss", "authz"]>;
        severity: z.ZodEnum<["P0", "P1", "P2"]>;
        cwe: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        description: z.ZodString;
        location: z.ZodObject<{
            file: z.ZodString;
            startLine: z.ZodNumber;
            endLine: z.ZodNumber;
            startColumn: z.ZodOptional<z.ZodNumber>;
            endColumn: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        }, {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        }>;
        codeSnippet: z.ZodString;
        confidence: z.ZodNumber;
        confidenceFactors: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodNumber;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            score: number;
            reason: string;
        }, {
            name: string;
            score: number;
            reason: string;
        }>, "many">;
        dependency: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            ecosystem: z.ZodString;
            installedVersion: z.ZodString;
            fixedVersion: z.ZodOptional<z.ZodString>;
            advisoryUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        }, {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        }>>;
        secretRuleId: z.ZodOptional<z.ZodString>;
        rawData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }, {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }>, "many">;
    highConfidenceFindings: z.ZodArray<z.ZodObject<{
        fingerprint: z.ZodString;
        scannerId: z.ZodString;
        category: z.ZodEnum<["secrets", "dependencies", "xss", "authz"]>;
        severity: z.ZodEnum<["P0", "P1", "P2"]>;
        cwe: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        description: z.ZodString;
        location: z.ZodObject<{
            file: z.ZodString;
            startLine: z.ZodNumber;
            endLine: z.ZodNumber;
            startColumn: z.ZodOptional<z.ZodNumber>;
            endColumn: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        }, {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        }>;
        codeSnippet: z.ZodString;
        confidence: z.ZodNumber;
        confidenceFactors: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodNumber;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            score: number;
            reason: string;
        }, {
            name: string;
            score: number;
            reason: string;
        }>, "many">;
        dependency: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            ecosystem: z.ZodString;
            installedVersion: z.ZodString;
            fixedVersion: z.ZodOptional<z.ZodString>;
            advisoryUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        }, {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        }>>;
        secretRuleId: z.ZodOptional<z.ZodString>;
        rawData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }, {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }>, "many">;
    lowConfidenceFindings: z.ZodArray<z.ZodObject<{
        fingerprint: z.ZodString;
        scannerId: z.ZodString;
        category: z.ZodEnum<["secrets", "dependencies", "xss", "authz"]>;
        severity: z.ZodEnum<["P0", "P1", "P2"]>;
        cwe: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        description: z.ZodString;
        location: z.ZodObject<{
            file: z.ZodString;
            startLine: z.ZodNumber;
            endLine: z.ZodNumber;
            startColumn: z.ZodOptional<z.ZodNumber>;
            endColumn: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        }, {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        }>;
        codeSnippet: z.ZodString;
        confidence: z.ZodNumber;
        confidenceFactors: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodNumber;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            score: number;
            reason: string;
        }, {
            name: string;
            score: number;
            reason: string;
        }>, "many">;
        dependency: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            ecosystem: z.ZodString;
            installedVersion: z.ZodString;
            fixedVersion: z.ZodOptional<z.ZodString>;
            advisoryUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        }, {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        }>>;
        secretRuleId: z.ZodOptional<z.ZodString>;
        rawData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }, {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }>, "many">;
    patches: z.ZodArray<z.ZodObject<{
        findingFingerprints: z.ZodArray<z.ZodString, "many">;
        title: z.ZodString;
        type: z.ZodEnum<["auto-fix", "notification-only"]>;
        rationale: z.ZodString;
        rollbackSteps: z.ZodArray<z.ZodString, "many">;
        fileChanges: z.ZodArray<z.ZodObject<{
            filePath: z.ZodString;
            diff: z.ZodString;
            changeType: z.ZodEnum<["create", "modify", "delete"]>;
        }, "strip", z.ZodTypeAny, {
            filePath: string;
            diff: string;
            changeType: "create" | "modify" | "delete";
        }, {
            filePath: string;
            diff: string;
            changeType: "create" | "modify" | "delete";
        }>, "many">;
        status: z.ZodEnum<["pending", "tests-passed", "tests-failed", "tests-skipped", "generation-failed"]>;
        testOutput: z.ZodOptional<z.ZodString>;
        breakingRisk: z.ZodEnum<["none", "low", "medium", "high"]>;
    }, "strip", z.ZodTypeAny, {
        type: "auto-fix" | "notification-only";
        status: "pending" | "tests-passed" | "tests-failed" | "tests-skipped" | "generation-failed";
        findingFingerprints: string[];
        title: string;
        rationale: string;
        rollbackSteps: string[];
        fileChanges: {
            filePath: string;
            diff: string;
            changeType: "create" | "modify" | "delete";
        }[];
        breakingRisk: "none" | "low" | "medium" | "high";
        testOutput?: string | undefined;
    }, {
        type: "auto-fix" | "notification-only";
        status: "pending" | "tests-passed" | "tests-failed" | "tests-skipped" | "generation-failed";
        findingFingerprints: string[];
        title: string;
        rationale: string;
        rollbackSteps: string[];
        fileChanges: {
            filePath: string;
            diff: string;
            changeType: "create" | "modify" | "delete";
        }[];
        breakingRisk: "none" | "low" | "medium" | "high";
        testOutput?: string | undefined;
    }>, "many">;
    prCreated: z.ZodBoolean;
    prUrl: z.ZodOptional<z.ZodString>;
    prNumber: z.ZodOptional<z.ZodNumber>;
    totalDurationMs: z.ZodNumber;
    errors: z.ZodArray<z.ZodString, "many">;
    checksum: z.ZodString;
}, "strip", z.ZodTypeAny, {
    checksum: string;
    version: "1.0";
    timestamp: string;
    guardprVersion: string;
    github: {
        repository: string;
        sha: string;
        ref: string;
        actor: string;
        runId: number;
        runAttempt: number;
        eventName: string;
    };
    toolVersions: Record<string, string>;
    rulesetHash: string;
    config: Record<string, unknown>;
    scanResults: {
        status: "success" | "partial" | "failed" | "skipped";
        findings: {
            title: string;
            scannerId: string;
            description: string;
            fingerprint: string;
            category: "secrets" | "dependencies" | "xss" | "authz";
            severity: "P0" | "P1" | "P2";
            location: {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            };
            codeSnippet: string;
            confidence: number;
            confidenceFactors: {
                name: string;
                score: number;
                reason: string;
            }[];
            cwe?: string | undefined;
            dependency?: {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            } | undefined;
            secretRuleId?: string | undefined;
            rawData?: Record<string, unknown> | undefined;
        }[];
        scannerId: string;
        durationMs: number;
        exitCode: number;
        error?: string | undefined;
    }[];
    allFindings: {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }[];
    highConfidenceFindings: {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }[];
    lowConfidenceFindings: {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }[];
    patches: {
        type: "auto-fix" | "notification-only";
        status: "pending" | "tests-passed" | "tests-failed" | "tests-skipped" | "generation-failed";
        findingFingerprints: string[];
        title: string;
        rationale: string;
        rollbackSteps: string[];
        fileChanges: {
            filePath: string;
            diff: string;
            changeType: "create" | "modify" | "delete";
        }[];
        breakingRisk: "none" | "low" | "medium" | "high";
        testOutput?: string | undefined;
    }[];
    prCreated: boolean;
    totalDurationMs: number;
    errors: string[];
    prUrl?: string | undefined;
    prNumber?: number | undefined;
}, {
    checksum: string;
    version: "1.0";
    timestamp: string;
    guardprVersion: string;
    github: {
        repository: string;
        sha: string;
        ref: string;
        actor: string;
        runId: number;
        runAttempt: number;
        eventName: string;
    };
    toolVersions: Record<string, string>;
    rulesetHash: string;
    config: Record<string, unknown>;
    scanResults: {
        status: "success" | "partial" | "failed" | "skipped";
        findings: {
            title: string;
            scannerId: string;
            description: string;
            fingerprint: string;
            category: "secrets" | "dependencies" | "xss" | "authz";
            severity: "P0" | "P1" | "P2";
            location: {
                file: string;
                startLine: number;
                endLine: number;
                startColumn?: number | undefined;
                endColumn?: number | undefined;
            };
            codeSnippet: string;
            confidence: number;
            confidenceFactors: {
                name: string;
                score: number;
                reason: string;
            }[];
            cwe?: string | undefined;
            dependency?: {
                name: string;
                ecosystem: string;
                installedVersion: string;
                fixedVersion?: string | undefined;
                advisoryUrl?: string | undefined;
            } | undefined;
            secretRuleId?: string | undefined;
            rawData?: Record<string, unknown> | undefined;
        }[];
        scannerId: string;
        durationMs: number;
        exitCode: number;
        error?: string | undefined;
    }[];
    allFindings: {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }[];
    highConfidenceFindings: {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }[];
    lowConfidenceFindings: {
        title: string;
        scannerId: string;
        description: string;
        fingerprint: string;
        category: "secrets" | "dependencies" | "xss" | "authz";
        severity: "P0" | "P1" | "P2";
        location: {
            file: string;
            startLine: number;
            endLine: number;
            startColumn?: number | undefined;
            endColumn?: number | undefined;
        };
        codeSnippet: string;
        confidence: number;
        confidenceFactors: {
            name: string;
            score: number;
            reason: string;
        }[];
        cwe?: string | undefined;
        dependency?: {
            name: string;
            ecosystem: string;
            installedVersion: string;
            fixedVersion?: string | undefined;
            advisoryUrl?: string | undefined;
        } | undefined;
        secretRuleId?: string | undefined;
        rawData?: Record<string, unknown> | undefined;
    }[];
    patches: {
        type: "auto-fix" | "notification-only";
        status: "pending" | "tests-passed" | "tests-failed" | "tests-skipped" | "generation-failed";
        findingFingerprints: string[];
        title: string;
        rationale: string;
        rollbackSteps: string[];
        fileChanges: {
            filePath: string;
            diff: string;
            changeType: "create" | "modify" | "delete";
        }[];
        breakingRisk: "none" | "low" | "medium" | "high";
        testOutput?: string | undefined;
    }[];
    prCreated: boolean;
    totalDurationMs: number;
    errors: string[];
    prUrl?: string | undefined;
    prNumber?: number | undefined;
}>;
export declare function generateChecksum(log: Omit<AuditLogEntry, "checksum">): string;
//# sourceMappingURL=schema.d.ts.map