import { XssRule, XssRuleMatch } from "./dangerous-inner-html";

export class EvalUsageRule implements XssRule {
  readonly name = "eval-usage";
  readonly cwe = "CWE-95";
  readonly description =
    "Detects usage of eval(), new Function(), setTimeout/setInterval with string arguments, which may allow code injection.";

  scan(content: string, _filePath: string): XssRuleMatch[] {
    const matches: XssRuleMatch[] = [];
    const lines = content.split("\n");

    // Patterns to detect dangerous eval-like calls
    const patterns = [
      /\beval\s*\(/g,
      /\bnew\s+Function\s*\(/g,
      /\bsetTimeout\s*\(\s*["'`]/g,
      /\bsetInterval\s*\(\s*["'`]/g,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trimStart();

      // Skip comment lines
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        continue;
      }

      for (const pattern of patterns) {
        const linePattern = new RegExp(pattern.source, pattern.flags);
        let lineMatch: RegExpExecArray | null;

        while ((lineMatch = linePattern.exec(line)) !== null) {
          // Skip if match is after a comment start on the same line
          const commentIdx = line.indexOf("//");
          if (commentIdx !== -1 && lineMatch.index > commentIdx) {
            continue;
          }

          // Skip if inside a block comment
          const blockCommentStart = line.indexOf("/*");
          const blockCommentEnd = line.indexOf("*/");
          if (
            blockCommentStart !== -1 &&
            lineMatch.index > blockCommentStart &&
            (blockCommentEnd === -1 || lineMatch.index < blockCommentEnd)
          ) {
            continue;
          }

          // Skip if it's inside a string (simple check: odd number of quotes before match)
          const before = line.slice(0, lineMatch.index);
          const singleQuotes = (before.match(/'/g) ?? []).length;
          const doubleQuotes = (before.match(/"/g) ?? []).length;
          const backticks = (before.match(/`/g) ?? []).length;
          if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
            continue;
          }

          matches.push({
            line: i + 1,
            column: lineMatch.index + 1,
            endLine: i + 1,
            endColumn: lineMatch.index + lineMatch[0].length + 1,
            matchedCode: line.trim(),
            ruleName: this.name,
            cwe: this.cwe,
            description: this.description,
          });
        }
      }
    }

    return matches;
  }
}
