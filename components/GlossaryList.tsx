"use client";
// Glossary with a filter; terms keep stable anchors (/glossary/#term) for links from the thesis text.
import { useMemo, useState } from "react";

export type GlossaryEntry = { term: string; id: string; definition: string; avoid: string | null };

const md = (s: string) => s.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/).map((p, i) =>
  p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith("`") ? <code key={i} className="mono">{p.slice(1, -1)}</code>
    : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? <i key={i}>{p.slice(1, -1)}</i> : p);

export function GlossaryList({ terms }: { terms: GlossaryEntry[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? terms.filter((t) => `${t.term} ${t.definition}`.toLowerCase().includes(n)) : terms;
  }, [q, terms]);
  return (
    <div className="flex flex-col gap-3">
      <input className="input max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter, e.g. override, solver, prompt" aria-label="filter the glossary" />
      <dl className="m-0 flex flex-col gap-2">
        {shown.map((t) => (
          <div key={t.id} id={t.id} className="panel p-3 scroll-mt-20 target:border-[var(--gold)]">
            <dt className="font-semibold text-[15px]"><a className="hover:underline" href={`#${t.id}`}>{t.term}</a></dt>
            <dd className="m-0 text-[14px] leading-relaxed">{md(t.definition)}</dd>
            {t.avoid && <dd className="m-0 mt-1 text-[13px] muted">Avoid: {md(t.avoid)}</dd>}
          </div>
        ))}
        {!shown.length && <p className="muted">No term matches.</p>}
      </dl>
    </div>
  );
}
