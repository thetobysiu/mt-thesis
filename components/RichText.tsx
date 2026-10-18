"use client";
// Observation and reasoning text with the engine's annotations coloured, coordinates linked to the map,
// and search matches marked.
import { Fragment, type ReactNode } from "react";

type Coord = { x: number; y: number } | null;

const TOKEN = new RegExp(
  [
    String.raw`(?<coord>\((?<cx>\d{1,2}),\s?(?<cy>\d{1,2})\))`,
    String.raw`(?<tag>\[(?:FREE|LETHAL|DEAD END|WINNABLE|UNWINNABLE|CANNOT|ALTERNATIVE ROUTE|SAFE|MODERATE|RISKY|DANGEROUS|STAT|OK|LOW|CRITICAL)[^\]\n]{0,80}\])`,
    String.raw`(?<eff>effCost=(?:-?\d+|None))`,
  ].join("|"),
  "g",
);
// phrases of the engine's annotation lines that a model's reasoning can quote
const CITED = /(effCost|min-cost@maxStats|min-cost|lookahead|ORDER|FREE if DEF\s?≥\s?\d+|DEAD END|LETHAL|WINNABLE at ATK\s?≥\s?\d+|Key budget|HP budget|stat gems behind it|net [+-−]\d+ HP|ALTERNATIVE ROUTE|margin [+-−]?\d+)/g;

function tagClass(tag: string): string {
  if (/^\[(FREE|SAFE|OK|LOW)/.test(tag)) return "ann ann-ok";
  if (/^\[(LETHAL|DEAD END|UNWINNABLE|CANNOT|CRITICAL|DANGEROUS)/.test(tag)) return "ann ann-bad";
  if (/^\[(WINNABLE|RISKY|MODERATE)/.test(tag)) return "ann ann-warn";
  return "ann ann-info";
}

function marks(text: string, search: RegExp | null, key: string): ReactNode {
  if (!search || !text) return text;
  const out: ReactNode[] = [];
  let last = 0, i = 0;
  for (const m of text.matchAll(search)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(<mark key={`${key}-m${i++}`}>{m[0]}</mark>);
    last = m.index! + m[0].length;
  }
  if (!out.length) return text;
  out.push(text.slice(last));
  return out;
}

function inline(text: string, opts: Opts, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, i = 0;
  const plain = (s: string) => {
    if (!opts.cite) return marks(s, opts.search, `${key}-p${i}`);
    const parts: ReactNode[] = [];
    let l = 0;
    for (const m of s.matchAll(CITED)) {
      if (m.index! > l) parts.push(marks(s.slice(l, m.index), opts.search, `${key}-c${i}-${l}`));
      parts.push(<span key={`${key}-ci${i}-${m.index}`} className="cite" title="quotes an annotation of the observation">{marks(m[0], opts.search, `${key}-cm${m.index}`)}</span>);
      l = m.index! + m[0].length;
    }
    parts.push(marks(s.slice(l), opts.search, `${key}-ce${i}`));
    return parts;
  };
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push(<Fragment key={`${key}-t${i}`}>{plain(text.slice(last, m.index))}</Fragment>);
    const g = m.groups!;
    if (g.coord) {
      const c = { x: Number(g.cx), y: Number(g.cy) };
      out.push(
        <span key={`${key}-k${i}`} className="coord" onMouseEnter={() => opts.onCoord?.(c)} onMouseLeave={() => opts.onCoord?.(null)}
              onFocus={() => opts.onCoord?.(c)} onBlur={() => opts.onCoord?.(null)} tabIndex={opts.onCoord ? 0 : undefined}>
          {marks(m[0], opts.search, `${key}-km${i}`)}
        </span>,
      );
    } else if (g.tag) {
      out.push(<span key={`${key}-k${i}`} className={tagClass(g.tag)}>{marks(m[0], opts.search, `${key}-km${i}`)}</span>);
    } else {
      out.push(<span key={`${key}-k${i}`} className="ann ann-info">{marks(m[0], opts.search, `${key}-km${i}`)}</span>);
    }
    last = m.index! + m[0].length;
    i++;
  }
  out.push(<Fragment key={`${key}-end`}>{plain(text.slice(last))}</Fragment>);
  return out;
}

type Opts = { search: RegExp | null; onCoord?: (c: Coord) => void; cite?: boolean };

export function searchRegex(q: string): RegExp | null {
  const t = q.trim();
  return t.length < 2 ? null : new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
}

function lineClass(line: string, chosen: number | null): string {
  const m = /^\s{0,4}(\d+)\. \[/.exec(line);
  if (m) return `ln ln-action${chosen != null && Number(m[1]) === chosen ? " ln-chosen" : ""}`;
  if (/^\s*→.*ORDER/.test(line)) return "ln ln-order";
  if (/^\s*→.*(stat gems|net [+-])/.test(line)) return "ln ln-stat";
  if (/^\s*(→|\(Note|effCost =|min-cost@|you save|scouting)/.test(line)) return "ln ln-note";
  if (/^(===|Hero:|Keys:|Key budget:|Position:|Goal:|HP budget|Available actions)/.test(line)) return "ln ln-head";
  return "ln";
}

/** The observation the engine sent at a decision: action lines, the chosen action highlighted. */
export function Observation({ text, chosen, search, onCoord }: { text: string; chosen: number | null; search: RegExp | null; onCoord?: (c: Coord) => void }) {
  const lines = text.split("\n");
  return (
    <div className="obs" data-testid="observation">
      {lines.map((ln, i) => <span key={i} className={lineClass(ln, chosen)}>{inline(ln, { search, onCoord }, `l${i}`)}{"\n"}</span>)}
    </div>
  );
}

/** The model's reasoning, with quoted annotations underlined. */
export function Reasoning({ text, search, onCoord }: { text: string; search: RegExp | null; onCoord?: (c: Coord) => void }) {
  return <div className="obs" data-testid="reasoning">{inline(text, { search, onCoord, cite: true }, "r")}</div>;
}
