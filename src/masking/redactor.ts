import { MASKING_PATTERNS } from "./patterns";

export interface RedactResult {
  redacted: string;
  secretValues: string[];
}

export function redactText(text: string): RedactResult {
  const secretValues: string[] = [];
  let redacted = text;

  for (const { pattern, maskFn } of MASKING_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    redacted = redacted.replace(regex, (match: string) => {
      if (!secretValues.includes(match)) {
        secretValues.push(match);
      }
      return maskFn(match);
    });
  }

  return { redacted, secretValues };
}
