import * as fs from "fs";

import { parse as parseYaml } from "yaml";

import { GuardPRConfig } from "../types/config";
import { GuardPRError } from "../types/errors";

import { DEFAULT_CONFIG } from "./defaults";
import { guardprYamlSchema } from "./schema";

export interface ActionInputs {
  configPath: string;
  confidenceThreshold?: number;
  createPr?: boolean;
  runTests?: boolean;
  testCommand?: string;
  scanners: string;
  githubToken: string;
  proApiKey?: string;
}

function parseScannerOverrides(
  scannersInput: string,
  base: GuardPRConfig["scanners"],
): GuardPRConfig["scanners"] {
  if (scannersInput === "all" || scannersInput === "") {
    return base;
  }

  const enabled = new Set(
    scannersInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );

  return {
    secrets: { ...base.secrets, enabled: enabled.has("secrets") },
    dependencies: { ...base.dependencies, enabled: enabled.has("dependencies") },
    xss: { ...base.xss, enabled: enabled.has("xss") },
    authz: { ...base.authz, enabled: enabled.has("authz") },
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function loadConfig(
  configPath: string,
  actionInputs: ActionInputs,
): Promise<GuardPRConfig> {
  let yamlConfig: Partial<GuardPRConfig> = {};

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed: unknown = parseYaml(raw);
    const result = guardprYamlSchema.safeParse(parsed ?? {});
    if (!result.success) {
      throw new GuardPRError(`Invalid config: ${result.error.message}`, "CONFIG_INVALID", false);
    }
    yamlConfig = result.data;
  } catch (err: unknown) {
    if (err instanceof GuardPRError) {
      throw err;
    }
    const isNotFound =
      err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
    if (!isNotFound) {
      throw new GuardPRError(
        `Failed to read config file: ${err instanceof Error ? err.message : String(err)}`,
        "CONFIG_INVALID",
        false,
        err,
      );
    }
    // File not found is OK: zero-config mode
  }

  const merged: GuardPRConfig = {
    ...DEFAULT_CONFIG,
    ...yamlConfig,
    configPath: actionInputs.configPath,
    confidenceThreshold:
      actionInputs.confidenceThreshold ??
      yamlConfig.confidenceThreshold ??
      DEFAULT_CONFIG.confidenceThreshold,
    createPr: actionInputs.createPr ?? yamlConfig.createPr ?? DEFAULT_CONFIG.createPr,
    runTests: actionInputs.runTests ?? yamlConfig.runTests ?? DEFAULT_CONFIG.runTests,
    testCommand: actionInputs.testCommand ?? yamlConfig.testCommand ?? DEFAULT_CONFIG.testCommand,
    githubToken: actionInputs.githubToken,
    scanners: {
      ...DEFAULT_CONFIG.scanners,
      ...(yamlConfig.scanners ?? {}),
    },
    patching: {
      ...DEFAULT_CONFIG.patching,
      ...(yamlConfig.patching ?? {}),
    },
    pro: {
      apiKey: actionInputs.proApiKey ?? "",
      endpoint: DEFAULT_CONFIG.pro.endpoint,
    },
  };

  merged.scanners = parseScannerOverrides(actionInputs.scanners, merged.scanners);

  return merged;
}
