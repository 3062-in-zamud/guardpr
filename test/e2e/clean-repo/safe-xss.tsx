import React from "react";
import DOMPurify from "dompurify";

interface ContentProps {
  htmlContent: string;
  text: string;
}

// Safe: dangerouslySetInnerHTML with DOMPurify sanitization
export function SafeHtmlContent({ htmlContent }: ContentProps) {
  const clean = DOMPurify.sanitize(htmlContent);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Safe: dangerouslySetInnerHTML with static string literal
export function StaticContent() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<strong>Hello World</strong>" }} />
  );
}

// Safe: using textContent instead of innerHTML
export function renderText(container: HTMLElement, text: string) {
  container.textContent = text;
}

// Safe: encoding user input before display
export function SafeSearchDisplay() {
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";
  const encoded = encodeURIComponent(query);

  return (
    <div>
      <h1>Search results for: {encoded}</h1>
    </div>
  );
}

// Safe: href with normal URL, not javascript:
export function SafeLink() {
  return <a href="https://example.com">External link</a>;
}

// Safe: dynamic but sanitized innerHTML
export function renderSanitized(container: HTMLElement, userHtml: string) {
  const sanitized = DOMPurify.sanitize(userHtml);
  container.innerHTML = sanitized;
}
