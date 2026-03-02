// True positive: innerHTML assignment with user-controlled value

export function renderComment(container: HTMLElement, commentHtml: string) {
  container.innerHTML = commentHtml;
}

export function updatePreview(previewEl: HTMLElement, markup: string) {
  previewEl.outerHTML = markup;
}
