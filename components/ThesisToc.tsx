"use client";
// Contents of the chapter being read; the section in view is highlighted and kept visible in a long list.
import { useEffect, useRef, useState } from "react";

type Heading = { id: string; text: string; depth: number };

export function ThesisToc({ label, headings }: { label: string; headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      // a heading counts as current once it reaches the upper fifth of the window
      const line = Math.min(160, window.innerHeight * 0.2);
      let cur = els[0].id;
      for (const el of els) { if (el.getBoundingClientRect().top <= line) cur = el.id; else break; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = els[els.length - 1].id;
      setActive(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [headings]);

  useEffect(() => {
    const nav = navRef.current;
    const a = nav?.querySelector<HTMLElement>("a.active");
    if (!nav || !a) return;
    if (a.offsetTop < nav.scrollTop || a.offsetTop + a.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTo({ top: a.offsetTop - nav.clientHeight / 3 });
    }
  }, [active]);

  return (
    <nav ref={navRef} className="toc" aria-label="on this page">
      <span className="eyebrow mb-1">{label}</span>
      {headings.map((h) => (
        <a key={h.id} href={`#${h.id}`} className={`${h.depth === 3 ? "pl-5" : ""} ${active === h.id ? "active" : ""}`}
           aria-current={active === h.id ? "location" : undefined}>{h.text}</a>
      ))}
      <a href="/thesis/thesis.pdf" className="mt-3">PDF</a>
    </nav>
  );
}
