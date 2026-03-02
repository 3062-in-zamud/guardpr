import { render } from "@testing-library/react";

describe("XSS test cases", () => {
  it("should render with innerHTML", () => {
    const el = document.createElement("div");
    el.innerHTML = "<p>test</p>";
    expect(el.textContent).toBe("test");
  });

  it("should handle dangerouslySetInnerHTML", () => {
    const { container } = render(
      <div dangerouslySetInnerHTML={{ __html: userInput }} />
    );
    expect(container.innerHTML).toBeTruthy();
  });
});
