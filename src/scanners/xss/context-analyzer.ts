import { ConfidenceFactor } from "../../types/finding";

export interface ContextAnalysis {
  confidence: number;
  factors: ConfidenceFactor[];
}

const BUILTIN_SANITIZERS = [
  "DOMPurify.sanitize",
  "DOMPurify",
  "escapeHtml",
  "encodeURIComponent",
  "encodeURI",
  "sanitizeHtml",
  "xss",
  "sanitize",
];

const USER_INPUT_PATTERNS = [
  "req.query",
  "req.body",
  "req.params",
  "searchParams",
  "useSearchParams",
  "location.search",
  "location.hash",
  "window.location",
  "document.referrer",
  "document.URL",
];

function isTestFile(filePath: string): boolean {
  return (
    /\.test\.[jt]sx?$/.test(filePath) ||
    /\.spec\.[jt]sx?$/.test(filePath) ||
    filePath.includes("__tests__/") ||
    filePath.includes("__test__/")
  );
}

function getContextLines(content: string, matchLine: number, radius: number): string {
  const lines = content.split("\n");
  const start = Math.max(0, matchLine - 1 - radius);
  const end = Math.min(lines.length, matchLine + radius);
  return lines.slice(start, end).join("\n");
}

function containsStaticStringOnly(_context: string, matchLine: number, content: string): boolean {
  const lines = content.split("\n");
  const line = lines[matchLine - 1] ?? "";

  // Check if the dangerouslySetInnerHTML or innerHTML assignment uses only a string literal
  if (
    /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*["'`][^"'`]*["'`]\s*\}\s*\}/.test(line)
  ) {
    return true;
  }
  if (/\.innerHTML\s*=\s*["'`][^"'`]*["'`]\s*;?\s*$/.test(line)) {
    return true;
  }

  return false;
}

export function analyzeContext(
  content: string,
  filePath: string,
  matchLine: number,
  customSanitizers: string[],
): ContextAnalysis {
  const factors: ConfidenceFactor[] = [];
  const context = getContextLines(content, matchLine, 10);
  const allSanitizers = [...BUILTIN_SANITIZERS, ...customSanitizers];

  // Check for test file
  if (isTestFile(filePath)) {
    factors.push({
      name: "test-file",
      score: 0.05,
      reason: "Pattern found in test file; likely not production code.",
    });
  }

  // Check for sanitizer nearby
  for (const sanitizer of allSanitizers) {
    if (context.includes(sanitizer)) {
      factors.push({
        name: "sanitizer-present",
        score: 0.1,
        reason: `Sanitizer "${sanitizer}" found near the vulnerable code.`,
      });
      break;
    }
  }

  // Check for static string only
  if (containsStaticStringOnly(context, matchLine, content)) {
    factors.push({
      name: "static-string",
      score: 0.1,
      reason: "The value appears to be a static string literal.",
    });
  }

  // Check for user input nearby
  for (const inputPattern of USER_INPUT_PATTERNS) {
    if (context.includes(inputPattern)) {
      factors.push({
        name: "user-input",
        score: 0.95,
        reason: `User input pattern "${inputPattern}" found near the vulnerable code.`,
      });
      break;
    }
  }

  // Determine final confidence
  if (factors.length === 0) {
    factors.push({
      name: "default",
      score: 0.7,
      reason: "No specific context factors detected; using default confidence.",
    });
  }

  // Take the minimum confidence (most conservative / safest for false positives)
  const confidence = Math.min(...factors.map((f) => f.score));

  return { confidence, factors };
}
