"use client";
// A collapsible group of floor cards; a closed group renders its cards only once opened (keeps the page light).
import { useState, type ReactNode } from "react";

export function FloorGroup({ id, title, summary, text, defaultOpen = false, children }:
  { id: string; title: string; summary: string; text: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details id={id} className="group-fold scroll-mt-20" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="fold-chevron" aria-hidden="true">›</span>
        <h2>{title}</h2>
        <span className="muted text-[13px]">{summary}</span>
      </summary>
      <div className="flex flex-col gap-3 pt-3">
        <p className="muted">{text}</p>
        {open && children}
      </div>
    </details>
  );
}
