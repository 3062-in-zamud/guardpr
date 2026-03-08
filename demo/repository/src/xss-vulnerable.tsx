import React from "react";

interface CommentProps {
  htmlContent: string;
  userInput: string;
}

// Vulnerable: dangerouslySetInnerHTML with user-provided content
export function UnsafeComment({ htmlContent }: CommentProps) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

// Vulnerable: dangerouslySetInnerHTML with req.query
export function SearchResults() {
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";

  return (
    <div>
      <h1>Search results for:</h1>
      <div dangerouslySetInnerHTML={{ __html: query }} />
    </div>
  );
}

// Vulnerable: innerHTML assignment with user input
export function renderUserContent(container: HTMLElement, userHtml: string) {
  container.innerHTML = userHtml;
}

// Vulnerable: href with javascript: protocol
export function MaliciousLink() {
  return <a href="javascript:alert('XSS')">Click me</a>;
}
