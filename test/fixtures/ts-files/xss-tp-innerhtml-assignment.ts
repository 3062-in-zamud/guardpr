function renderContent(userInput: string) {
  const el = document.getElementById("target");
  if (el) {
    el.innerHTML = userInput;
  }
}

function renderOuter(userInput: string) {
  const el = document.getElementById("target");
  if (el) {
    el.outerHTML = userInput;
  }
}
