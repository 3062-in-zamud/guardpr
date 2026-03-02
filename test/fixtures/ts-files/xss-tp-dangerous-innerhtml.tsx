import React from "react";

interface Props {
  userContent: string;
}

export function UnsafeComponent({ userContent }: Props) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: userContent }}
    />
  );
}

export function AnotherUnsafe() {
  const data = req.query.html;
  return <div dangerouslySetInnerHTML={{ __html: data }} />;
}
