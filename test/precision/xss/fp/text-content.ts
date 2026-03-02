// False positive: uses textContent (safe), not innerHTML

export function renderSafe(container: HTMLElement, text: string) {
  container.textContent = text;
}

export function setTitle(el: HTMLElement, title: string) {
  el.textContent = title;
}
