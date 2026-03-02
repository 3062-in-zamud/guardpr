export interface MaskingPattern {
  name: string;
  pattern: RegExp;
  maskFn: (match: string) => string;
}

function genericMask(match: string): string {
  const visible = match.slice(0, 4);
  const redactedLen = match.length - 4;
  return `${visible}[REDACTED ${redactedLen} chars]`;
}

export const MASKING_PATTERNS: MaskingPattern[] = [
  {
    name: "AWS Access Key",
    pattern: /AKIA[0-9A-Z]{16}/g,
    maskFn: (match: string) => {
      const prefix = match.slice(0, 4);
      const suffix = match.slice(-4);
      return `${prefix}****${suffix}`;
    },
  },
  {
    name: "GitHub PAT (classic)",
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    maskFn: genericMask,
  },
  {
    name: "GitHub PAT (fine-grained)",
    pattern: /github_pat_[a-zA-Z0-9_]{80,}/g,
    maskFn: genericMask,
  },
  {
    name: "RSA Private Key",
    pattern: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
    maskFn: () => "[REDACTED RSA PRIVATE KEY]",
  },
  {
    name: "Generic Password Assignment",
    pattern:
      /(?:password|passwd|pwd|secret|token|api_key|apikey|api-key|access_key|private_key)\s*[:=]\s*["']([^"'\s]{8,})["']/gi,
    maskFn: (match: string) => {
      const eqIndex = match.search(/[:=]/);
      const prefix = match.slice(0, eqIndex + 1);
      const rest = match.slice(eqIndex + 1);
      const quoteMatch = /\s*["']/.exec(rest);
      if (quoteMatch === null) {
        return match;
      }
      const quotePrefix = rest.slice(0, quoteMatch.index + quoteMatch[0].length);
      const quote = quoteMatch[0].trim();
      const value = rest.slice(quoteMatch.index + quoteMatch[0].length, -1);
      const masked =
        value.length > 4
          ? `${value.slice(0, 4)}[REDACTED ${value.length - 4} chars]`
          : "[REDACTED]";
      return `${prefix}${quotePrefix}${masked}${quote}`;
    },
  },
  {
    name: "Generic High-Entropy Token",
    pattern: /(?:(?:sk|rk|pk)[-_](?:live|test|prod)[-_][a-zA-Z0-9]{20,})/g,
    maskFn: genericMask,
  },
];
