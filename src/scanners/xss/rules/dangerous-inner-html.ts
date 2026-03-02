export interface XssRuleMatch {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  matchedCode: string;
  ruleName: string;
  cwe: string;
  description: string;
}

export interface XssRule {
  readonly name: string;
  readonly cwe: string;
  readonly description: string;
  scan(content: string, filePath: string): XssRuleMatch[];
}

export class DangerousInnerHtmlRule implements XssRule {
  readonly name = "dangerous-inner-html";
  readonly cwe = "CWE-79";
  readonly description =
    "Detects dangerouslySetInnerHTML with non-literal expressions, which may allow XSS attacks.";

  scan(content: string, _filePath: string): XssRuleMatch[] {
    const matches: XssRuleMatch[] = [];
    const lines = content.split("\n");

    // Match dangerouslySetInnerHTML={{ __html: <expr> }}
    // We need to handle multi-line cases too, so scan the full content
    const pattern =
      /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*((?:[^}]|\}(?!\s*\}))*?)\s*\}\s*\}/g;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const expr = match[1]?.trim();
      if (expr === undefined) {
        continue;
      }

      // Skip if the value is a simple string literal ("..." or '...' or `...` with no interpolation)
      if (/^["'][^"']*["']$/.test(expr)) {
        continue;
      }
      if (/^`[^`$]*`$/.test(expr)) {
        continue;
      }

      const beforeMatch = content.slice(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      const lastNewline = beforeMatch.lastIndexOf("\n");
      const column = match.index - lastNewline;

      const matchEnd = match.index + match[0].length;
      const beforeEnd = content.slice(0, matchEnd);
      const endLine = beforeEnd.split("\n").length;
      const lastNewlineEnd = beforeEnd.lastIndexOf("\n");
      const endColumn = matchEnd - lastNewlineEnd;

      matches.push({
        line: lineNumber,
        column,
        endLine,
        endColumn,
        matchedCode: match[0],
        ruleName: this.name,
        cwe: this.cwe,
        description: this.description,
      });
    }

    // Also detect the pattern across lines using a line-by-line scan
    // for cases where the regex above may not capture multi-line variants
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (line.includes("dangerouslySetInnerHTML") && !matches.some((m) => m.line === i + 1)) {
        // Try to reconstruct a multi-line block from this point
        let block = "";
        let braceDepth = 0;
        let started = false;
        let endLineIdx = i;

        for (let j = i; j < lines.length && j < i + 10; j++) {
          block += (j > i ? "\n" : "") + (lines[j] ?? "");
          for (const ch of lines[j] ?? "") {
            if (ch === "{") {
              braceDepth++;
              started = true;
            }
            if (ch === "}") {
              braceDepth--;
            }
          }
          if (started && braceDepth <= 0) {
            endLineIdx = j;
            break;
          }
        }

        const blockPattern =
          /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:\s*((?:[^}]|\}(?!\s*\}))*?)\s*\}\s*\}/;
        const blockMatch = blockPattern.exec(block);
        if (blockMatch !== null) {
          const expr = blockMatch[1]?.trim();
          if (expr === undefined) {
            continue;
          }
          if (/^["'][^"']*["']$/.test(expr)) {
            continue;
          }
          if (/^`[^`$]*`$/.test(expr)) {
            continue;
          }

          const col = (lines[i] ?? "").indexOf("dangerouslySetInnerHTML") + 1;

          if (!matches.some((m) => m.line === i + 1)) {
            matches.push({
              line: i + 1,
              column: col,
              endLine: endLineIdx + 1,
              endColumn: (lines[endLineIdx] ?? "").length + 1,
              matchedCode: blockMatch[0],
              ruleName: this.name,
              cwe: this.cwe,
              description: this.description,
            });
          }
        }
      }
    }

    return matches;
  }
}
