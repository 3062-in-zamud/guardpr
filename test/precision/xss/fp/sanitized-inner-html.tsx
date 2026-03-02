import React from "react";
import DOMPurify from "dompurify";

// False positive: dangerouslySetInnerHTML with DOMPurify sanitization nearby
interface Props {
  content: string;
}

export function SafeRender({ content }: Props) {
  const clean = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
