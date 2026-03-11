import * as fs from "fs";
import * as path from "path";

import { Finding } from "../types";

import { convertSarifToFindings } from "./converter";
import { sarifLogSchema } from "./schema";

export function loadSarifFile(filePath: string): Finding[] {
  // Path traversal protection: reject paths outside GITHUB_WORKSPACE
  const workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(workspace))) {
    throw new Error(
      `SARIF file path must be within the workspace directory. ` +
        `Got: ${filePath}`,
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(resolved, "utf-8");
  } catch {
    throw new Error(
      `SARIF file not found: ${filePath}. ` +
        `Ensure the previous step completed successfully.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Invalid JSON in SARIF file: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const result = sarifLogSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 3);
    const details = issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid SARIF 2.1.0 file:\n${details}\n` +
        `See https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html`,
    );
  }

  return convertSarifToFindings(result.data);
}
