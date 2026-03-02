import React from "react";

// True positive: href constructed from user input (searchParams)
export function DynamicLink() {
  const searchParams = new URLSearchParams(window.location.search);
  const redirectUrl = searchParams.get("redirect") || "/";

  return <a href={searchParams.get("url")}>Go</a>;
}
