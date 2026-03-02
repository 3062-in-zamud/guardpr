import * as core from "@actions/core";

import { AuditLogEntry, Finding } from "../types";

import { redactText } from "./redactor";

export class MaskingLayer {
  registerSecrets(values: string[]): void {
    for (const value of values) {
      core.setSecret(value);
    }
  }

  maskOutput(text: string): string {
    const { redacted, secretValues } = redactText(text);
    this.registerSecrets(secretValues);
    return redacted;
  }

  maskFinding(finding: Finding): Finding {
    const masked = { ...finding };

    const snippetResult = redactText(masked.codeSnippet);
    masked.codeSnippet = snippetResult.redacted;
    this.registerSecrets(snippetResult.secretValues);

    if (masked.rawData !== undefined) {
      const rawStr = JSON.stringify(masked.rawData);
      const rawResult = redactText(rawStr);
      this.registerSecrets(rawResult.secretValues);
      masked.rawData = JSON.parse(rawResult.redacted) as Record<string, unknown>;
    }

    return masked;
  }

  maskAuditLog(log: AuditLogEntry): AuditLogEntry {
    const json = JSON.stringify(log);
    const { redacted, secretValues } = redactText(json);
    this.registerSecrets(secretValues);
    return JSON.parse(redacted) as AuditLogEntry;
  }
}
