import * as core from "@actions/core";

export class MaskingLayer {
  private maskedValues = new Set<string>();

  register(secret: string): void {
    if (secret.length < 4) {
      return;
    }
    if (this.maskedValues.has(secret)) {
      return;
    }
    this.maskedValues.add(secret);
    core.setSecret(secret);
  }

  mask(text: string): string {
    let result = text;
    for (const secret of this.maskedValues) {
      result = result.split(secret).join("***");
    }
    return result;
  }

  get registeredCount(): number {
    return this.maskedValues.size;
  }
}
