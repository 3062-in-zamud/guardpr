import React from "react";

// False positive: test file - XSS patterns in tests are not production vulnerabilities

describe("rendering", () => {
  it("renders HTML content", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>test content</p>";
    expect(container.textContent).toBe("test content");
  });

  it("uses dangerouslySetInnerHTML for snapshot", () => {
    const el = <div dangerouslySetInnerHTML={{ __html: "<b>bold</b>" }} />;
    expect(el).toBeDefined();
  });
});
