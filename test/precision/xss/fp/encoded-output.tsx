import React from "react";

// False positive: user input is encoded before display, no dangerouslySetInnerHTML
export function SafeSearch() {
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get("q") || "";
  const encoded = encodeURIComponent(query);

  return (
    <div>
      <h1>Results for: {encoded}</h1>
    </div>
  );
}
