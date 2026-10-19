// Success-rate bars with Wilson 95 % whiskers, and floor bars for tower runs. No client code: rendered at build time.
import Link from "next/link";
import { wilson } from "@/lib/format";

export type Bar = { k: number; n: number; group?: string; href?: string; title?: string };
export type RateRow = { label: string; sub?: string; href?: string; bars: Bar[] };
type Group = { id: string; label: string; colour: string };

function Legend({ groups }: { groups?: Group[] }) {
  if (!groups) return null;
  return (
    <div className="flex flex-wrap gap-3 text-[12px] muted">
      {groups.map((g) => <span key={g.id} className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: g.colour }} />{g.label}</span>)}
    </div>
  );
}

export function RateBars({ rows, caption, groups }: { rows: RateRow[]; caption?: React.ReactNode; groups?: Group[] }) {
  const colour = (g?: string) => groups?.find((x) => x.id === g)?.colour ?? "var(--gold)";
  const name = (g?: string) => groups?.find((x) => x.id === g)?.label;
  return (
    <figure className="flex flex-col gap-2 m-0">
      <Legend groups={groups} />
      <div className="flex flex-col gap-2" role="list">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] items-center gap-x-3" role="listitem">
            <span className="text-[13px] leading-tight">
              {r.href ? <Link className="link" href={r.href}>{r.label}</Link> : r.label}
              {r.sub && <span className="block muted text-[12px]">{r.sub}</span>}
            </span>
            <span className="flex flex-col gap-1">
              {r.bars.map((b, j) => {
                const [lo, hi] = wilson(b.k, b.n);
                const p = b.n ? b.k / b.n : 0;
                return (
                  <span key={j} className="relative h-5 rounded bg-[var(--bg-2)]"
                        title={`${name(b.group) ? `${name(b.group)}: ` : ""}${b.k} of ${b.n}; Wilson 95 % interval ${lo.toFixed(2)}–${hi.toFixed(2)}`}>
                    <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${p * 100}%`, background: colour(b.group), opacity: 0.85 }} />
                    <span className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-[var(--text)] opacity-60" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
                    <span className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[var(--text)] opacity-60" style={{ left: `${lo * 100}%` }} />
                    <span className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-[var(--text)] opacity-60" style={{ left: `calc(${hi * 100}% - 2px)` }} />
                  </span>
                );
              })}
            </span>
            <span className="flex flex-col gap-1">
              {r.bars.map((b, j) => (
                <span key={j} className="mono text-[13px] h-5 leading-5 text-right w-12">
                  {b.href ? <Link href={b.href} title={name(b.group)}>{b.k}/{b.n}</Link> : `${b.k}/${b.n}`}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      {caption && <figcaption className="muted text-[12px]">{caption}</figcaption>}
    </figure>
  );
}

export type FloorRow = { label: string; sub?: string; floor: number; href?: string; note?: string; group?: string };

/** Highest tower floor reached (0–23); the normal ending is on MT21. */
export function FloorBars({ rows, caption, groups }: { rows: FloorRow[]; caption?: React.ReactNode; groups?: Group[] }) {
  const max = 23;
  const colour = (g?: string) => groups?.find((x) => x.id === g)?.colour ?? "var(--gold)";
  return (
    <figure className="flex flex-col gap-2 m-0">
      <Legend groups={groups} />
      <div className="flex flex-col gap-[6px]" role="list">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] items-center gap-3" role="listitem">
            <span className="text-[13px] leading-tight">
              {r.href ? <Link className="link" href={r.href}>{r.label}</Link> : r.label}
              {r.sub && <span className="block muted text-[12px]">{r.sub}</span>}
            </span>
            <span className="relative h-5 rounded bg-[var(--bg-2)]">
              <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.floor / max) * 100}%`, background: colour(r.group), opacity: 0.85 }} />
              <span className="absolute inset-y-[-3px] w-[2px] bg-[var(--ok)]" style={{ left: `${(21 / max) * 100}%` }} title="normal ending: MT21" />
            </span>
            <span className="mono text-[13px] w-36 shrink-0 whitespace-nowrap">MT{r.floor}{r.note ? <span className="muted"> {r.note}</span> : null}</span>
          </div>
        ))}
      </div>
      {caption && <figcaption className="muted text-[12px]">{caption}</figcaption>}
    </figure>
  );
}
