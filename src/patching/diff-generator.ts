export function generateUnifiedDiff(
  filePath: string,
  originalContent: string,
  modifiedContent: string,
): string {
  const originalLines = originalContent.split("\n");
  const modifiedLines = modifiedContent.split("\n");

  const hunks: string[] = [];
  let i = 0;
  let j = 0;

  while (i < originalLines.length || j < modifiedLines.length) {
    // Find the next difference
    if (
      i < originalLines.length &&
      j < modifiedLines.length &&
      originalLines[i] === modifiedLines[j]
    ) {
      i++;
      j++;
      continue;
    }

    // Found a difference — build a hunk with context
    const contextBefore = 3;
    const contextAfter = 3;
    const hunkStartOrig = Math.max(0, i - contextBefore);
    const hunkStartMod = Math.max(0, j - contextBefore);

    const hunkLines: string[] = [];

    // Add context before
    for (let k = hunkStartOrig; k < i; k++) {
      hunkLines.push(` ${originalLines[k] ?? ""}`);
    }

    // Collect changed lines
    const diffStartI = i;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (
        i < originalLines.length &&
        j < modifiedLines.length &&
        originalLines[i] === modifiedLines[j]
      ) {
        // Check if we have enough matching lines to end the hunk
        let matchCount = 0;
        while (
          i + matchCount < originalLines.length &&
          j + matchCount < modifiedLines.length &&
          originalLines[i + matchCount] === modifiedLines[j + matchCount]
        ) {
          matchCount++;
          if (matchCount > contextAfter * 2) {
            break;
          }
        }
        if (matchCount > contextAfter * 2) {
          break;
        }
        // Not enough matching — include as context within the hunk
        for (let k = 0; k < matchCount; k++) {
          // Check if we already added removals/additions
          hunkLines.push(` ${originalLines[i + k] ?? ""}`);
        }
        i += matchCount;
        j += matchCount;
        continue;
      }

      if (
        i < originalLines.length &&
        (j >= modifiedLines.length || originalLines[i] !== modifiedLines[j])
      ) {
        hunkLines.push(`-${originalLines[i] ?? ""}`);
        i++;
      }
      if (
        j < modifiedLines.length &&
        (diffStartI === i || i > diffStartI) &&
        (i >= originalLines.length || originalLines[i] !== modifiedLines[j])
      ) {
        hunkLines.push(`+${modifiedLines[j] ?? ""}`);
        j++;
      }
    }

    // Add context after
    const contextEnd = Math.min(i + contextAfter, originalLines.length);
    for (let k = i; k < contextEnd; k++) {
      hunkLines.push(` ${originalLines[k] ?? ""}`);
    }

    const origCount = hunkLines.filter((l) => l.startsWith(" ") || l.startsWith("-")).length;
    const modCount = hunkLines.filter((l) => l.startsWith(" ") || l.startsWith("+")).length;

    hunks.push(
      `@@ -${hunkStartOrig + 1},${origCount} +${hunkStartMod + 1},${modCount} @@\n${hunkLines.join("\n")}`,
    );

    // Advance past context
    i = contextEnd;
    j = Math.min(j + contextAfter, modifiedLines.length);
  }

  if (hunks.length === 0) {
    return "";
  }

  return [`--- a/${filePath}`, `+++ b/${filePath}`, ...hunks].join("\n") + "\n";
}
