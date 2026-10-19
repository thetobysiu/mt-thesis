"use client";
// Results by thesis table: sticky contents with the current group highlighted, a filter over all cells, one table per group.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IndexText } from "./IndexText";
import { Rate } from "./Outcome";
import type { CellSummary, TableSummary } from "@/lib/data-types";
import { modelName, pct, scenarioName } from "@/lib/format";

export type CellRowData = Pick<CellSummary, "label" | "model" | "scenario" | "tower" | "n" | "successes" | "ci" | "hpRatio" | "died"> & { floors: string };

const shortTitle = (t: string) => t.replace(/\$([^$]*)\$/g, "$1").replace(/\s*\(.*$/, "").replace(/,\s*/, " · ");

function Row({ c }: { c: CellRowData }) {
  return (
    <tr>
      <td>{modelName(c.model)}</td>
      <td>{scenarioName(c.scenario)}</td>
      <td className="num">{c.n}</td>
      <td>{c.tower ? <span className="mono" title="highest floor reached, per run">{c.floors || "–"}</span> : <Rate successes={c.successes} n={c.n} ci={c.ci} />}</td>
      <td className="num">{c.tower ? "–" : pct(c.hpRatio)}</td>
      <td className="num">{c.died ?? "–"}</td>
      <td><Link className="link mono text-[13px]" href={`/results/${c.label}/`}>{c.label}</Link></td>
    </tr>
  );
}

const Head = () => (
  <thead>
    <tr>
      <th>model</th><th>floor</th><th className="num">N</th><th>wins [95 % CI] · tower: highest floor</th>
      <th className="num" title="final HP / exact optimum, mean over wins">HP / opt</th><th className="num">died</th><th>cell (open for episodes)</th>
    </tr>
  </thead>
);

export function ResultsBrowser({ tables, cells, uncited }: { tables: TableSummary[]; cells: Record<string, CellRowData>; uncited: CellRowData[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(tables[0]?.id ?? null);
  const needle = q.trim().toLowerCase();
  const match = useMemo(() => (c: CellRowData) =>
    !needle || `${c.label} ${modelName(c.model)} ${scenarioName(c.scenario)}`.toLowerCase().includes(needle), [needle]);

  useEffect(() => {
    const els = tables.map((t) => document.getElementById(t.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    }, { rootMargin: "-70px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [tables]);

  const visible = tables.map((t) => ({ t, rows: t.items.filter((it) => !it.isCell || match(cells[it.label])) }))
    .filter(({ t, rows }) => !needle || rows.some((r) => r.isCell) || t.title.toLowerCase().includes(needle));

  return (
    <div className="with-toc">
      <nav className="toc" aria-label="Thesis tables">
        <span className="eyebrow px-2 pb-2">Thesis tables</span>
        {tables.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={active === t.id ? "active" : ""}>{shortTitle(t.title)}</a>
        ))}
        <a href="#uncited">Further cells</a>
      </nav>
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input flex-1 min-w-[240px]" value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="Filter cells by model, floor or label (e.g. hand03, DeepSeek, canon)" aria-label="filter cells" />
          {needle && <span className="muted text-[13px]">{visible.reduce((s, v) => s + v.rows.filter((r) => r.isCell).length, 0)} matching cells</span>}
        </div>
        {visible.map(({ t, rows }) => (
          <section key={t.id} id={t.id} className="widget">
            <header><span className="w-title"><IndexText text={t.title} /></span></header>
            <div className="body flex flex-col gap-2">
              {t.files && <p className="muted text-[13px]">Files: <IndexText text={t.files} /></p>}
              {t.items.length === 0 ? <p className="muted text-[13px]">Computed from the run logs; no separate result file.</p> : (
                <div className="scroll-x">
                  <table className="tbl">
                    <Head />
                    <tbody>
                      {rows.map((it) => it.isCell && cells[it.label] ? <Row key={it.path} c={cells[it.label]} /> : (
                        <tr key={it.path}>
                          <td colSpan={6} className="muted">{it.kind === "gepa_study" ? "prompt-optimisation result (its own pages come later)" : "result file (raw JSON)"}</td>
                          <td><a className="link mono text-[13px]" href={`/data/${it.path}`}>{it.label}</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ))}
        <section id="uncited" className="widget">
          <header><span className="w-title">Further cells not cited by the thesis ({uncited.filter(match).length})</span></header>
          <div className="body">
            <p className="muted text-[13px] mb-2">Development runs, earlier versions of a configuration and pilots, listed for completeness; the thesis does not report them.</p>
            <details open={!!needle}>
              <summary className="text-[14px]">show the list</summary>
              <div className="scroll-x mt-2">
                <table className="tbl"><Head /><tbody>{uncited.filter(match).map((c) => <Row key={c.label} c={c} />)}</tbody></table>
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}
