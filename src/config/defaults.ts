import { GuardPRConfig } from "../types/config";

export const GUARDPR_PRO_WEBHOOK_ENDPOINT = "https://api.guardpr.dev/webhook";

export const DEFAULT_CONFIG: GuardPRConfig = {
  configPath: ".guardpr.yml",
  confidenceThreshold: 0.9,
  createPr: true,
  runTests: true,
  testCommand: "npm test",
  scanners: {
    secrets: {
      enabled: true,
      maxTargetMegabytes: 10,
    },
    dependencies: {
      enabled: true,
    },
    xss: {
      enabled: true,
      customSanitizers: [],
    },
    authz: {
      enabled: true,
      protectedRoutes: [],
      authMiddleware: ["isAuthenticated", "isAdmin", "requireAuth"],
      framework: "auto",
    },
  },
  patching: {
    maxLinesPerPatch: 50,
    maxFilesPerPatch: 5,
  },
  githubToken: "",
  pro: {
    apiKey: "",
    endpoint: GUARDPR_PRO_WEBHOOK_ENDPOINT,
  },
};
