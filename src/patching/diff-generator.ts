export function generateUnifiedDiff(
  filePath: string,
  originalContent: string,
  modifiedContent: string,
): string {
  if (originalContent === modifiedContent) {
    return "";
  }

  const originalLines = originalContent.split("\n");
  const modifiedLines = modifiedContent.split("\n");

  // Step 1: Compute LCS table
  const m = originalLines.length;
  const n = modifiedLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (originalLines[i - 1] === modifiedLines[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Step 2: Backtrack to get edit operations
  interface EditOp {
    type: "keep" | "delete" | "insert";
    text: string;
  }
  const ops: EditOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      ops.push({ type: "keep", text: originalLines[i - 1]! });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.push({ type: "insert", text: modifiedLines[j - 1]! });
      j--;
    } else {
      ops.push({ type: "delete", text: originalLines[i - 1]! });
      i--;
    }
  }

  ops.reverse();

  // Step 3: Find positions of changes in the ops array
  const changeIndices: number[] = [];
  for (let k = 0; k < ops.length; k++) {
    if (ops[k]!.type !== "keep") {
      changeIndices.push(k);
    }
  }

  if (changeIndices.length === 0) {
    return "";
  }

  // Step 4: Group nearby changes into hunks (merge if within 2*CONTEXT)
  const CONTEXT = 3;
  const groups: { first: number; last: number }[] = [];
  let groupFirst = changeIndices[0]!;
  let groupLast = changeIndices[0]!;

  for (let k = 1; k < changeIndices.length; k++) {
    if (changeIndices[k]! - groupLast <= CONTEXT * 2) {
      groupLast = changeIndices[k]!;
    } else {
      groups.push({ first: groupFirst, last: groupLast });
      groupFirst = changeIndices[k]!;
      groupLast = changeIndices[k]!;
    }
  }
  groups.push({ first: groupFirst, last: groupLast });

  // Step 5: Generate each hunk with context
  const hunks: string[] = [];

  for (const group of groups) {
    const hunkStart = Math.max(0, group.first - CONTEXT);
    const hunkEnd = Math.min(ops.length - 1, group.last + CONTEXT);

    // Compute original/modified line numbers at hunkStart
    let origLine = 0;
    let modLine = 0;
    for (let k = 0; k < hunkStart; k++) {
      const t = ops[k]!.type;
      if (t === "keep" || t === "delete") origLine++;
      if (t === "keep" || t === "insert") modLine++;
    }

    let origCount = 0;
    let modCount = 0;
    const hunkLines: string[] = [];

    for (let k = hunkStart; k <= hunkEnd; k++) {
      const op = ops[k]!;
      switch (op.type) {
        case "keep":
          hunkLines.push(` ${op.text}`);
          origCount++;
          modCount++;
          break;
        case "delete":
          hunkLines.push(`-${op.text}`);
          origCount++;
          break;
        case "insert":
          hunkLines.push(`+${op.text}`);
          modCount++;
          break;
      }
    }

    hunks.push(
      `@@ -${origLine + 1},${origCount} +${modLine + 1},${modCount} @@\n${hunkLines.join("\n")}`,
    );
  }

  return [`--- a/${filePath}`, `+++ b/${filePath}`, ...hunks].join("\n") + "\n";
}
