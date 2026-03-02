function executeUserCode(code: string) {
  eval(code);
}

function createDynamicFunction(body: string) {
  const fn = new Function("arg", body);
  return fn;
}

function delayedExec(code: string) {
  setTimeout("alert('xss')", 1000);
}

function repeatedExec() {
  setInterval("doSomething()", 500);
}
