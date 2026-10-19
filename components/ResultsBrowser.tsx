"use client";
// Results by thesis section and table: sticky contents with the current group highlighted, a filter over all cells,
// one table per group with its cells sorted by floor.
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { IndexText } from "./IndexText";
import { Rate } from "./Outcome";
import type { CellSummary, TableSummary } from "@/lib/data-types";
import { floorRank } from "@/lib/floors";
import { modelName, pct, scenarioName } from "@/lib/format";
import { groupBySection } from "@/lib/results-sections";

export type CellRowData = Pick<CellSummary, "label" | "model" | "scenario" | "tower" | "n" | "successes" | "ci" | "hpRatio" | "died"> & { floors: string };
type TableItem = TableSummary["items"][number];

const shortTitle = (t: string) => t.replace(/\$([^$]*)\$/g, "$1").replace(/\s*\(.*$/, "").replace(/,\s*/, " · ");

/** The part of a cell label that is not floor or model, e.g. "canon_hp60" or "final11_reactive". */
function configOf(c: CellRowData): string {
  const floor = c.scenario.replace(/\.txt$/, "");
  let s = c.label.replace(/^tower_/, "");
  if (s.startsWith(`${floor}_`)) s = s.slice(floor.length + 1);
  // labels carry the preset name, a prefix of the model id ("qwen3.5-397b" for "qwen3.5-397b-a17b")
  const parts = (c.model ?? "").split("-");
  const preset = parts.map((_, i) => parts.slice(0, parts.length - i).join("-")).find((p) => p && s.includes(p));
  if (preset) s = s.split(`${preset}_`).join("").split(preset).join("");
  return s.replace(/__+/g, "_").replace(/^_|_$/g, "") || c.label;
}

function Row({ c }: { c: CellRowData }) {
  return (
    <tr>
      <td>{modelName(c.model)}</td>
      <td>{scenarioName(c.scenario)}</td>
      <td className="num">{c.n}</td>
      <td>{c.tower ? <span className="mono" title="highest floor reached, per run">{c.floors || "–"}</span> : <Rate successes={c.successes} n={c.n} ci={c.ci} />}</td>
      <td className="num">{c.tower ? "–" : pct(c.hpRatio)}</td>
      <td className="num">{c.died ?? "–"}</td>
      <td><Link className="link mono text-[13px]" href={`/results/${c.label}/`} title={c.label}>{configOf(c)}</Link></td>
    </tr>
  );
}

const Head = () => (
  <thead>
    <tr>
      <th>model</th><th>floor</th><th className="num">N</th><th>wins [95 % CI] · tower: highest floor</th>
      <th className="num" title="final HP / exact optimum, mean over wins">HP / opt</th><th className="num">died</th><th title="the cell label without floor and model; open it for settings and episodes, hover for the full label">configuration</th>
    </tr>
  </thead>
);

const byFloor = (a: CellRowData, b: CellRowData) => floorRank(a.scenario) - floorRank(b.scenario)
  || configOf(a).localeCompare(configOf(b)) || modelName(a.model).localeCompare(modelName(b.model));

/** Cell rows sorted by floor, with a floor sub-header whenever the table spans several floors. */
function CellRows({ rows }: { rows: CellRowData[] }) {
  const sorted = [...rows].sort(byFloor);
  const several = new Set(sorted.map((c) => c.scenario)).size > 1;
  return sorted.map((c, i) => (
    <Fragment key={c.label}>
      {several && c.scenario !== sorted[i - 1]?.scenario && <tr className="tbl-group"><td colSpan={7}>{scenarioName(c.scenario)}</td></tr>}
      <Row c={c} />
    </Fragment>
  ));
}

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

  const sections = useMemo(() => groupBySection(tables), [tables]);
  const rowsOf = (t: TableSummary) => t.items.filter((it) => !(it.isCell && cells[it.label]) || match(cells[it.label]));
  const shown = (t: TableSummary) => !needle || rowsOf(t).some((r) => r.isCell) || t.title.toLowerCase().includes(needle);
  const matching = tables.filter(shown).reduce((s, t) => s + rowsOf(t).filter((r) => r.isCell).length, 0);

  return (
    <div className="with-toc">
      <nav className="toc" aria-label="Thesis tables">
        <span className="eyebrow px-2 pb-1">Chapter 6</span>
        {sections.map((s) => (
          <Fragment key={s.id}>
            <a className="toc-section" href={`#sec-${s.id}`}>{s.id === "fig" ? s.title : `${s.id} ${s.title}`}</a>
            {s.tables.map((t) => (
              <a key={t.id} href={`#${t.id}`} className={active === t.id ? "active" : ""}>{shortTitle(t.title)}</a>
            ))}
          </Fragment>
        ))}
        <a className="toc-section" href="#uncited">Not cited by the thesis</a>
      </nav>
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input flex-1 min-w-[240px]" value={q} onChange={(e) => setQ(e.target.value)}
                 placeholder="Filter cells by model, floor or label (e.g. hand03, DeepSeek, canon)" aria-label="filter cells" />
          {needle && <span className="muted text-[13px]">{matching} matching cells</span>}
        </div>
        {sections.map((s) => {
          const list = s.tables.filter(shown);
          if (!list.length) return null;
          return (
            <Fragment key={s.id}>
              <div id={`sec-${s.id}`} className="flex flex-wrap items-baseline gap-x-3 scroll-mt-20 pt-2">
                <h2>{s.id === "fig" ? s.title : `${s.id} ${s.title}`}</h2>
                {s.id !== "fig" && <Link className="link text-[13px]" href={`/thesis/experiments/#s-${s.id.replace(".", "-")}`}>Section {s.id} in the thesis</Link>}
              </div>
              {list.map((t) => <TableGroup key={t.id} t={t} rows={rowsOf(t)} cells={cells} />)}
            </Fragment>
          );
        })}
        <section id="uncited" className="widget scroll-mt-20">
          <header><span className="w-title">Further cells not cited by the thesis ({uncited.filter(match).length})</span></header>
          <div className="body">
            <p className="muted text-[13px] mb-2">Development runs, earlier versions of a configuration and pilots, listed for completeness; the thesis does not report them.</p>
            <details open={!!needle}>
              <summary className="text-[14px]">show the list</summary>
              <div className="scroll-x mt-2">
                <table className="tbl"><Head /><tbody><CellRows rows={uncited.filter(match)} /></tbody></table>
              </div>
            </details>
          </div>
        </section>
      </div>
    </div>
  );
}

function TableGroup({ t, rows, cells }: { t: TableSummary; rows: TableItem[]; cells: Record<string, CellRowData> }) {
  const cellRows = rows.filter((it) => it.isCell && cells[it.label]).map((it) => cells[it.label]);
  const files = rows.filter((it) => !(it.isCell && cells[it.label]));
  return (
    <section id={t.id} className="widget scroll-mt-20">
      <header><span className="w-title"><IndexText text={t.title} /></span></header>
      <div className="body flex flex-col gap-2">
        {t.files && <p className="muted text-[13px]">Files: <IndexText text={t.files} /></p>}
        {t.items.length === 0 ? <p className="muted text-[13px]">Computed from the run logs; no separate result file.</p> : (
          <div className="scroll-x">
            <table className="tbl">
              <Head />
              <tbody>
                <CellRows rows={cellRows} />
                {files.map((it) => (
                  <tr key={it.path}>
                    <td colSpan={6} className="muted">{it.kind === "gepa_study" ? "prompt-optimisation result (see Prompt optimisation)" : "result file (raw JSON)"}</td>
                    <td><a className="link mono text-[13px]" href={`/data/${it.path}`}>{it.label}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
