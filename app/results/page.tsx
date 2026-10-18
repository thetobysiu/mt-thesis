import type { Metadata } from "next";
import Link from "next/link";
import { IndexText } from "@/components/IndexText";
import { Rate } from "@/components/Outcome";
import { getResults } from "@/lib/data";
import type { CellSummary } from "@/lib/data-types";
import { modelName, pct, scenarioName } from "@/lib/format";

export const metadata: Metadata = { title: "Results" };

function CellRow({ c }: { c: CellSummary }) {
  return (
    <tr>
      <td><Link className="link mono" href={`/results/${c.label}/`}>{c.label}</Link></td>
      <td>{modelName(c.model)}</td>
      <td>{scenarioName(c.scenario)}</td>
      <td className="num">{c.n}</td>
      <td>{c.tower ? <span className="mono" title="highest floor reached, per run">{c.runs.map((x) => x.maxFloor ?? "?").join(", ") || "–"}</span> : <Rate successes={c.successes} n={c.n} ci={c.ci} />}</td>
      <td className="num">{c.tower ? "–" : pct(c.hpRatio)}</td>
      <td className="num">{c.died ?? "–"}</td>
    </tr>
  );
}

const HEAD = (
  <thead>
    <tr>
      <th>cell (result file)</th><th>model</th><th>floor</th><th className="num">N</th><th>wins [95 % CI] · tower: highest floor</th>
      <th className="num" title="final HP / exact optimum, mean over wins">HP / opt</th><th className="num">died</th>
    </tr>
  </thead>
);

export default function ResultsPage() {
  const r = getResults();
  const cells = new Map(r.cells.map((c) => [c.label, c]));
  const uncited = r.cells.filter((c) => !c.thesis);
  return (
    <div className="page">
      <section className="flex flex-col gap-2">
        <h1>Results</h1>
        <p className="lead">
          Every number in the thesis comes from a result file. A <b>cell</b> is one configuration with one model on one floor (or the tower),
          played N times; each row below is one cell, grouped as in the thesis (Appendix D, Table D.4). Open a cell for its settings, every
          episode with a replay, and the command that re-runs it in <a className="link" href={r.source.repo}>mt-ai-lab</a>.
        </p>
        <p className="muted text-[12px]">
          {r.tables.length} groups · {r.cells.filter((c) => c.thesis).length} cells cited by the thesis · {uncited.length} further cells ·
          data from mt-ai-lab {r.source.version ?? ""}. Wins count episodes that defeated the boss alive; tower cells report the highest floor reached.
        </p>
      </section>
      {r.tables.map((t) => (
        <section key={t.id} id={t.id} className="widget">
          <header><span className="w-title"><IndexText text={t.title} /></span></header>
          <div className="body flex flex-col gap-2">
            {t.files && <p className="muted text-[12px]">Files: <IndexText text={t.files} /></p>}
            {t.items.length === 0 ? <p className="muted text-[12px]">Computed from the run logs; no separate result file.</p> : (
              <div className="scroll-x">
                <table className="tbl">
                  {HEAD}
                  <tbody>
                    {t.items.map((it) => {
                      const c = it.isCell ? cells.get(it.label) : undefined;
                      if (c) return <CellRow key={it.path} c={c} />;
                      return (
                        <tr key={it.path}>
                          <td><a className="link mono" href={`/data/${it.path}`}>{it.label}</a></td>
                          <td colSpan={6} className="muted">{it.kind === "gepa_study" ? "prompt-optimisation result (shown on the prompt-optimisation pages)" : "result file (raw JSON)"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ))}
      <details className="widget">
        <summary className="px-3 py-2 heading text-[13px]">Further cells not cited by the thesis ({uncited.length})</summary>
        <div className="body">
          <p className="muted text-[12px] mb-2">Development runs, earlier versions of a configuration and pilots. They are listed for completeness; the thesis does not report them.</p>
          <div className="scroll-x">
            <table className="tbl">{HEAD}<tbody>{uncited.map((c) => <CellRow key={c.label} c={c} />)}</tbody></table>
          </div>
        </div>
      </details>
    </div>
  );
}
