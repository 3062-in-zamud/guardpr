import React from "react";

// True positive: javascript: protocol in href attribute
export function DangerousLink() {
  return <a href="javascript:alert(document.cookie)">Click</a>;
}
