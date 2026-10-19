import type { Metadata } from "next";
import Link from "next/link";
import { getCell } from "@/lib/data";
import { JOURNEY, type JourneyLink, type Milestone } from "@/lib/journey";

export const metadata: Metadata = {
  title: "Journey",
  description: "How the agent and its evaluation were developed: single scored episodes, silent overrides, one-sided annotations, a wrong published optimum, and the final configuration.",
};

const KIND: Record<NonNullable<Milestone["kind"]>, { label: string; cls: string }> = {
  finding: { label: "finding", cls: "tag-info" },
  incident: { label: "validity incident", cls: "tag-warn" },
  change: { label: "change", cls: "" },
};

function Chip({ l }: { l: JourneyLink }) {
  if (l.cell) {
    const c = getCell(l.cell);
    if (!c) return null;
    const v = c.tower ? (c.floorsMax != null ? `MT${c.floorsMax}` : "–") : c.successes != null ? `${c.successes}/${c.n}` : "–";
    return (
      <Link className="tag hover:border-[var(--gold)]" href={`/results/${c.label}/`} title={c.label}>
        {l.label} <b className="mono">{v}</b>
      </Link>
    );
  }
  return l.href ? <Link className="tag hover:border-[var(--gold)]" href={l.href}>{l.label} →</Link> : null;
}

export default function JourneyPage() {
  const total = JOURNEY.reduce((n, p) => n + p.items.length, 0);
  return (
    <div className="page">
      <section className="hero flex flex-col gap-4">
        <span className="eyebrow">Journey</span>
        <h1>From single episodes to the final configuration</h1>
        <p className="lead">
          The thesis reports where the work ended. This page shows how it got there: {total} milestones from April to October 2026,
          including the readings that later turned out to be wrong and the validity incidents that exposed them.
        </p>
        <p className="muted text-[14px]">
          Sources: Appendix E of the thesis (the dated validity incidents), the development history of the framework
          (<a className="link" href="https://github.com/thetobysiu/mt-ai-lab/blob/main/docs/development-history.md">docs/development-history.md</a>)
          and the result files linked from each milestone. Chips show the stored result: wins / episodes, or the highest tower floor.
        </p>
        <nav className="flex flex-wrap gap-2" aria-label="phases">
          {JOURNEY.map((p) => <a key={p.id} className="btn btn-sm" href={`#${p.id}`}>{p.title}</a>)}
        </nav>
      </section>

      {JOURNEY.map((p) => (
        <section key={p.id} id={p.id} className="flex flex-col gap-3 scroll-mt-20" aria-labelledby={`${p.id}-h`}>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h2 id={`${p.id}-h`}>{p.title}</h2>
            <span className="mono muted text-[13px]">{p.span}</span>
          </div>
          {p.intro && <p className="muted max-w-[80ch]">{p.intro}</p>}
          <ol className="journey list-none m-0 p-0">
            {p.items.map((m) => (
              <li key={m.date + m.title} className="journey-item">
                <span className="journey-dot" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-[12px] text-[var(--gold)]">{m.date}</span>
                    {m.kind && <span className={`tag ${KIND[m.kind].cls}`}>{KIND[m.kind].label}</span>}
                  </div>
                  <h3 className="text-[16px]">{m.title}</h3>
                  <p className="text-[15px] leading-relaxed max-w-[78ch]">{m.body}</p>
                  {(m.then || m.now) && (
                    <div className="grid gap-2 sm:grid-cols-2 max-w-[78ch]">
                      {m.then && <div className="panel p-2 text-[13px]"><span className="tag tag-bad">reading then</span> <span className="muted">{m.then}</span></div>}
                      {m.now && <div className="panel p-2 text-[13px]"><span className="tag tag-ok">what holds now</span> {m.now}</div>}
                    </div>
                  )}
                  {m.links?.length ? <div className="flex flex-wrap gap-2">{m.links.map((l) => <Chip key={l.label + (l.cell ?? l.href)} l={l} />)}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
