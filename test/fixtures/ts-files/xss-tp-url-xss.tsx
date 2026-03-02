import React from "react";

export function MaliciousLink() {
  return <a href="javascript:alert('xss')">Click me</a>;
}

export function DynamicHref() {
  const url = req.query.redirect;
  return <a href={req.query.url}>Go</a>;
}

export function ImgSrc() {
  return <img src="javascript:alert('xss')" />;
}
