function safeRender(userInput: string) {
  const el = document.getElementById("target");
  if (el) {
    el.textContent = userInput;
  }
}

function anotherSafe(userInput: string) {
  const el = document.getElementById("target");
  if (el) {
    el.innerText = userInput;
  }
}
