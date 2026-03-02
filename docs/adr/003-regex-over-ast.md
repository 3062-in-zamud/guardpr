# ADR-003: Regex-Based XSS Detection over AST

## Status

Accepted

## Context

GuardPR includes a built-in XSS scanner that detects dangerous patterns in TypeScript/JavaScript/JSX/TSX files. The two main approaches for static analysis are:

1. **AST-based analysis**: Parse source code into an Abstract Syntax Tree using the TypeScript compiler API or a parser like `@babel/parser`, then walk the tree to find dangerous nodes.
2. **Regex + context analysis**: Use regular expressions to find dangerous patterns, combined with contextual heuristics (sanitizer presence, user input proximity, test file detection) to score confidence.

## Decision

We chose **regex-based detection with context analysis** for the beta release.

Key reasons:

- **Bundle size**: The `typescript` npm package is approximately 67 MB. Bundling it with `@vercel/ncc` would produce a 15-25 MB `dist/index.js`. Since GitHub Actions clones the action repository on every run, this size is impractical and would slow down every workflow that uses GuardPR.
- **Practical for diff-scoped analysis**: GuardPR scans PR diffs and repository files, not full program semantics. The patterns we detect (dangerouslySetInnerHTML, innerHTML assignment, eval usage, javascript: URLs) have distinctive textual signatures that regex matches reliably.
- **Context analysis compensates**: The `context-analyzer.ts` module examines surrounding code (10-line radius) for sanitizer calls (`DOMPurify.sanitize`, `encodeURIComponent`, etc.) and user input patterns (`req.query`, `searchParams`, etc.). This raises or lowers confidence scores to reduce false positives without full semantic understanding.
- **Four focused rules**: The XSS scanner implements exactly four rules:
  1. `dangerous-inner-html` -- `dangerouslySetInnerHTML` with non-literal expressions
  2. `inner-html-assignment` -- `.innerHTML =` / `.outerHTML =` assignment
  3. `eval-usage` -- `eval()`, `new Function()`, `setTimeout`/`setInterval` with strings
  4. `url-xss` -- `javascript:` protocol in href/src, dynamic URLs from user input

  These rules have well-defined regex patterns and clear true/false positive boundaries.

## Consequences

**Positive:**

- Minimal bundle size. The XSS scanner adds negligible weight to `dist/index.js`.
- Fast execution. Regex scanning of typical source files takes milliseconds.
- Easy to add new rules. Each rule is a self-contained class implementing the `XssRule` interface.
- Confidence scoring provides an auditable signal for each finding.

**Negative:**

- Cannot detect indirect data flow (e.g., user input assigned to a variable, then passed to `innerHTML` three function calls later). This is a fundamental limitation of regex-based analysis.
- May produce false positives for complex code patterns where regex matches but the code is actually safe.
- May miss obfuscated patterns (e.g., `window["eval"](...)`).

**Future direction:**

GA release may add AST-based analysis via one of these approaches:
- A composite action step that installs the TypeScript compiler at runtime (not bundled).
- A separate companion action for deep analysis.
- A lightweight parser like `acorn` (~200 KB) for JavaScript-only AST analysis.
