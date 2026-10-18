import type { ReactNode } from "react";

/** Inline rendering of the thesis index strings: `code` spans and $math$ (shown as plain italics). */
export function IndexText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\$([^$]+)\$/g;
  let last = 0, i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(m[1] != null ? <code key={i++}>{m[1]}</code> : <i key={i++}>{m[2].replace(/\\,/g, " ")}</i>);
    last = m.index! + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}
