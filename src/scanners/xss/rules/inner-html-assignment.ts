import { XssRule, XssRuleMatch } from "./dangerous-inner-html";

export class InnerHtmlAssignmentRule implements XssRule {
  readonly name = "inner-html-assignment";
  readonly cwe = "CWE-79";
  readonly description =
    "Detects direct innerHTML or outerHTML assignment, which may allow XSS attacks.";

  scan(content: string, _filePath: string): XssRuleMatch[] {
    const matches: XssRuleMatch[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";

      // Skip single-line comments
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//")) {
        continue;
      }

      let lineMatch: RegExpExecArray | null;
      const linePattern = /\.innerHTML\s*=|\.outerHTML\s*=/g;
      while ((lineMatch = linePattern.exec(line)) !== null) {
        // Check if this match is inside a comment on this line
        const commentIdx = line.indexOf("//");
        if (commentIdx !== -1 && lineMatch.index > commentIdx) {
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

    return matches;
  }
}
