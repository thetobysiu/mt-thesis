import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GepaRunView } from "@/components/GepaRunView";
import { GEPA_RUNS, getGepaRun } from "@/lib/gepa";
import { modelName } from "@/lib/format";

export const dynamicParams = false;
export function generateStaticParams() { return GEPA_RUNS.map((m) => ({ run: m.label })); }

type Params = { params: Promise<{ run: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { run } = await params;
  const m = GEPA_RUNS.find((x) => x.label === run);
  return { title: m ? `${m.study}: ${m.title}` : "Prompt optimisation run" };
}

export default async function GepaRunPage({ params }: Params) {
  const run = getGepaRun((await params).run);
  if (!run) notFound();
  const m = run.meta;
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Prompt optimisation · {m.study} · Section {m.section}</span>
        <h1>{m.title}</h1>
        <p className="lead">{m.note}</p>
        <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr] m-0">
          <dt className="muted">Loop</dt><dd className="m-0">{run.method}, {run.candidates.length} candidates</dd>
          <dt className="muted">Task model</dt><dd className="m-0">{modelName(run.taskModel)}</dd>
          <dt className="muted">Teacher</dt><dd className="m-0">{modelName(run.teacherModel)}</dd>
          <dt className="muted">Starting prompt</dt><dd className="m-0 mono">{run.seedFile}</dd>
          <dt className="muted">Observation</dt><dd className="m-0">{run.observation}</dd>
          <dt className="muted">Training floors</dt><dd className="m-0">{run.floors.join(", ")} · {run.episodesPerFloor} episode{run.episodesPerFloor === 1 ? "" : "s"} each</dd>
          {run.started && <><dt className="muted">Started</dt><dd className="m-0 mono">{run.started.slice(0, 16).replace("T", " ")}</dd></>}
          <dt className="muted">Result file</dt><dd className="m-0"><a className="link mono" href={`/data/results/gepa/gepa_result_${m.label}.json`}>gepa_result_{m.label}.json</a></dd>
        </dl>
      </section>

      {run.heldOut.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="heldout">
          <h2 id="heldout" className="text-[17px]">Evaluation after the run</h2>
          <div className="scroll-x">
            <table className="tbl text-[13px]">
              <thead><tr><th>Floors</th><th>Prompt</th><th>Kills</th><th>Mean goal score</th></tr></thead>
              <tbody>
                {run.heldOut.filter((h) => h.split !== "all" || !run.heldOut.some((x) => x.split === "test")).map((h) => (
                  <tr key={`${h.split}-${h.arm}`}>
                    <td>{h.split === "test" ? "held-out" : h.split === "train" ? "training" : "all"}</td>
                    <td>{h.label}</td>
                    <td className="mono">{h.success}/{h.n}</td>
                    <td className="mono">{h.goal.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {m.studyFile && <p className="muted text-[12px]">From <a className="link mono" href={`/data/results/gepa_study/${m.studyFile}.json`}>{m.studyFile}.json</a>; its episodes are listed on the <Link className="link" href="/episodes/">episodes page</Link>.</p>}
        </section>
      )}

      <GepaRunView run={run} />
      <p className="text-[13px]"><Link className="link" href="/prompt-optimisation/">← all prompt-optimisation runs</Link></p>
    </div>
  );
}
