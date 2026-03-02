// True positive: eval with dynamic user input

export function evaluate(expression: string): unknown {
  return eval(expression);
}

export function buildFunction(code: string): Function {
  return new Function("data", code);
}
