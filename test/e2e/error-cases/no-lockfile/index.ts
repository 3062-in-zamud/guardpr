// This directory has source files but no lockfile.
// The dependency scanner should skip gracefully.

export function add(a: number, b: number): number {
  return a + b;
}
