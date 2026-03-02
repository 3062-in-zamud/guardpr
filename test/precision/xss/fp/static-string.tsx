import React from "react";

// False positive: dangerouslySetInnerHTML with static string literal
export function StaticHtml() {
  return (
    <div dangerouslySetInnerHTML={{ __html: "<strong>Welcome!</strong>" }} />
  );
}
