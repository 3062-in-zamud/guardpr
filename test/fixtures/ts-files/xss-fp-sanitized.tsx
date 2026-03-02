import React from "react";
import DOMPurify from "dompurify";

interface Props {
  userContent: string;
}

export function SafeComponent({ userContent }: Props) {
  const clean = DOMPurify.sanitize(userContent);
  return (
    <div
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
