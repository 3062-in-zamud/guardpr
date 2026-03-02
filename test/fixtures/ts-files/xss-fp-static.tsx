import React from "react";

export function StaticContent() {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: "<p>Hello World</p>" }}
    />
  );
}

export function AnotherStatic() {
  return <span dangerouslySetInnerHTML={{ __html: "<b>Bold</b>" }} />;
}
