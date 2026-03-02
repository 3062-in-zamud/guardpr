import React from "react";

// True positive: dangerouslySetInnerHTML with variable (non-literal) content
interface Props {
  content: string;
}

export function UnsafeRender({ content }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
