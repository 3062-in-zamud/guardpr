import { z } from "zod";

const authzProtectedRouteSchema = z.object({
  pattern: z.string(),
  requiredMiddleware: z.array(z.string()),
});

const authzScannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  protectedRoutes: z.array(authzProtectedRouteSchema).default([]),
  authMiddleware: z.array(z.string()).default(["isAuthenticated", "isAdmin", "requireAuth"]),
  framework: z.enum(["auto", "express", "nextjs"]).default("auto"),
});

const xssScannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  customSanitizers: z.array(z.string()).default([]),
});

const secretsScannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxTargetMegabytes: z.number().positive().default(10),
});

const dependencyScannerConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

const scannersConfigSchema = z.object({
  secrets: secretsScannerConfigSchema.default({}),
  dependencies: dependencyScannerConfigSchema.default({}),
  xss: xssScannerConfigSchema.default({}),
  authz: authzScannerConfigSchema.default({}),
});

const patchingConfigSchema = z.object({
  maxLinesPerPatch: z.number().positive().default(50),
  maxFilesPerPatch: z.number().positive().default(5),
});

export const guardprYamlSchema = z.object({
  confidenceThreshold: z.number().min(0).max(1).default(0.9),
  createPr: z.boolean().default(true),
  runTests: z.boolean().default(true),
  testCommand: z.string().default("npm test"),
  scanners: scannersConfigSchema.default({}),
  patching: patchingConfigSchema.default({}),
});

export type GuardPRYamlInput = z.input<typeof guardprYamlSchema>;
