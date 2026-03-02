// Vulnerable: eval() with dynamic input

export function executeUserCode(code: string): unknown {
  // Dangerous: eval with user-provided code
  return eval(code);
}

export function createDynamicFunction(body: string): Function {
  // Dangerous: new Function with user-provided body
  return new Function("input", body);
}

export function scheduleUserAction(action: string, delayMs: number): void {
  // Dangerous: setTimeout with string argument
  setTimeout("console.log('action: " + action + "')", delayMs);
}

export function processTemplate(template: string, data: Record<string, string>): string {
  // Dangerous: eval for template processing
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(`{{${key}}}`, value);
  }
  return eval("`" + result + "`");
}
