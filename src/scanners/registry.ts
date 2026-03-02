import type { DetectionCategory, ScannerPlugin } from "../types";

export class ScannerRegistry {
  private scanners = new Map<string, ScannerPlugin>();

  register(scanner: ScannerPlugin): void {
    this.scanners.set(scanner.id, scanner);
  }

  get(id: string): ScannerPlugin | undefined {
    return this.scanners.get(id);
  }

  getAll(): ScannerPlugin[] {
    return Array.from(this.scanners.values());
  }

  getByCategory(category: DetectionCategory): ScannerPlugin[] {
    return this.getAll().filter((s) => s.category === category);
  }
}
