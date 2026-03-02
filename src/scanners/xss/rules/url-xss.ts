import { XssRule, XssRuleMatch } from "./dangerous-inner-html";

export class UrlXssRule implements XssRule {
  readonly name = "url-xss";
  readonly cwe = "CWE-79";
  readonly description =
    "Detects javascript: protocol in href/src attributes and dynamic URL construction with user input.";

  scan(content: string, _filePath: string): XssRuleMatch[] {
    const matches: XssRuleMatch[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trimStart();

      // Skip comment lines
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        continue;
      }

      // Detect javascript: protocol in href/src attributes
      const jsProtocolPatterns = [
        /(?:href|src)\s*=\s*["'`]\s*javascript\s*:/gi,
        /(?:href|src)\s*=\s*\{[^}]*["'`]\s*javascript\s*:/gi,
      ];

      for (const pattern of jsProtocolPatterns) {
        const linePattern = new RegExp(pattern.source, pattern.flags);
        let lineMatch: RegExpExecArray | null;

        while ((lineMatch = linePattern.exec(line)) !== null) {
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

      // Detect dynamic URL construction with user input in href/src
      // e.g., href={userInput} or src={`${req.query.url}`}
      const dynamicUrlPatterns = [
        /(?:href|src)\s*=\s*\{\s*(?:req\.query|req\.body|req\.params|searchParams|useSearchParams|params)\b/g,
        /(?:href|src)\s*=\s*\{`[^`]*\$\{(?:req\.query|req\.body|req\.params|searchParams|useSearchParams|params)\b/g,
        /(?:href|src)\s*=\s*\{[^}]*\+\s*(?:req\.query|req\.body|req\.params|searchParams|useSearchParams|params)\b/g,
      ];

      for (const pattern of dynamicUrlPatterns) {
        const linePattern = new RegExp(pattern.source, pattern.flags);
        let lineMatch: RegExpExecArray | null;

        while ((lineMatch = linePattern.exec(line)) !== null) {
          // Avoid duplicates from javascript: protocol already found
          if (!matches.some((m) => m.line === i + 1 && m.column === lineMatch!.index + 1)) {
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
    }

    return matches;
  }
}
