import * as fs from "fs";

import * as core from "@actions/core";
import { AnnotationProperties } from "@actions/core";

export function startGroup(name: string): void {
  core.startGroup(name);
}

export function endGroup(): void {
  core.endGroup();
}

export function info(msg: string): void {
  core.info(msg);
}

export function warn(msg: string, properties?: AnnotationProperties): void {
  core.warning(msg, properties);
}

export function error(msg: string): void {
  core.error(msg);
}

export function debug(msg: string): void {
  core.debug(msg);
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function writeSummary(markdown: string): Promise<void> {
  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (summaryPath !== undefined && summaryPath !== "") {
    fs.appendFileSync(summaryPath, markdown + "\n");
  }
}
