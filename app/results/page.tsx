import type { Metadata } from "next";
import { ResultsBrowser, type CellRowData } from "@/components/ResultsBrowser";
import { getResults } from "@/lib/data";
import type { CellSummary } from "@/lib/data-types";

export const metadata: Metadata = { title: "Results" };

const row = (c: CellSummary): CellRowData => ({
  label: c.label, model: c.model, scenario: c.scenario, tower: c.tower, n: c.n, successes: c.successes, ci: c.ci,
  hpRatio: c.hpRatio, died: c.died, floors: c.runs.map((x) => x.maxFloor ?? "?").join(", "),
});

export default function ResultsPage() {
  const r = getResults();
  const cells = Object.fromEntries(r.cells.filter((c) => c.thesis).map((c) => [c.label, row(c)]));
  const uncited = r.cells.filter((c) => !c.thesis).map(row);
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Evidence</span>
        <h1>Results</h1>
        <p className="lead">
          Every number in the thesis comes from a result file. A <b>cell</b> is one configuration with one model on one floor (or the tower),
          played N times. The cells are grouped as in the thesis (Appendix D, Table D.4); open one for its settings, every episode with a
          replay, and the command that re-runs it in <a className="link" href={r.source.repo}>mt-ai-lab</a>.
        </p>
        <p className="muted text-[13px]">
          {r.tables.length} groups · {Object.keys(cells).length} cells cited by the thesis · {uncited.length} further cells · data from mt-ai-lab {r.source.version ?? ""}.
          Wins count episodes that defeated the boss alive; tower cells report the highest floor reached.
        </p>
      </section>
      <ResultsBrowser tables={r.tables} cells={cells} uncited={uncited} />
    </div>
  );
}
