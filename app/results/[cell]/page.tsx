import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Rate } from "@/components/Outcome";
import { getCell, getResults } from "@/lib/data";
import { modelName, num, pct, scenarioName } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return getResults().cells.map((c) => ({ cell: c.label }));
}

type Params = { params: Promise<{ cell: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cell } = await params;
  return { title: `Cell ${decodeURIComponent(cell)}` };
}

export default async function CellPage({ params }: Params) {
  const label = decodeURIComponent((await params).cell);
  const c = getCell(label);
  if (!c) notFound();
  const r = getResults();
  const titles = new Map(r.tables.map((t) => [t.id, t.title.replace(/\$[^$]*\$/g, (m) => m.slice(1, -1))]));
  const settings: [string, string][] = [
    ["Floor", scenarioName(c.scenario)],
    ["Model", `${modelName(c.model)} (${c.model ?? "none"}${c.taskMode ? `, ${c.taskMode}` : ""})`],
    ["Planning", c.mode ?? "reactive"],
    ["Prompt", c.prompt ?? "–"],
    ["Temperature", c.temperature != null ? String(c.temperature) : "–"],
    ["Lookahead depth", c.lookahead != null ? String(c.lookahead) : "–"],
    ["Mechanical overrides", c.overridesOff ? "off (all engine replacements and assists disabled)" : "on (logged per turn)"],
  ];
  if (c.checkpoint != null) settings.push(["Walkthrough checkpoint", String(c.checkpoint)]);
  const envEntries = Object.entries(c.env);
  const where = c.tower ? `the tower (${c.scenario.replace("-", "→")})`
    : c.scenario === "simple" || c.scenario === "complex" ? `the ${c.scenario} floor` : c.scenario;
  return (
    <div className="page">
      <section className="flex flex-col gap-2">
        <p className="muted text-[12px]"><Link className="link" href="/results/">Results</Link> / cell</p>
        <h1 className="break-all">{c.label}</h1>
        <p className="lead">
          {modelName(c.model)} on {where}, {c.n} {c.tower ? "run" : "episode"}{c.n === 1 ? "" : "s"}.{" "}
          {c.thesis ? "Cited by the thesis in:" : "Not cited by the thesis (development or earlier run)."}
        </p>
        {c.tables.length > 0 && (
          <ul className="list-disc pl-6">
            {c.tables.map((t) => <li key={t}><Link className="link" href={`/results/#${t}`}>{titles.get(t) ?? t}</Link></li>)}
          </ul>
        )}
      </section>

      <div className="grid gap-[var(--gap)] md:grid-cols-2">
        <section className="widget">
          <header><span className="w-title">Outcome</span></header>
          <div className="body">
            <table className="tbl"><tbody>
              {c.tower
                ? <tr><td>Highest floor reached, per run</td><td className="mono">{c.runs.map((x) => x.maxFloor ?? "?").join(", ")}</td></tr>
                : <>
                    <tr><td>Wins (boss defeated, alive)</td><td><Rate successes={c.successes} n={c.n} ci={c.ci} /></td></tr>
                    <tr><td>Final HP / exact optimum, mean over wins</td><td className="mono">{pct(c.hpRatio)}</td></tr>
                  </>}
              <tr><td>Died</td><td className="mono">{c.died ?? "–"}</td></tr>
              <tr><td>Final HP, mean</td><td className="mono">{num(c.finalHpMean, 0)}</td></tr>
              <tr><td>Seconds per model call</td><td className="mono">{num(c.secondsPerCall, 1)}</td></tr>
              <tr><td>Parse error rate</td><td className="mono">{pct(c.parseErrorRate, 1)}</td></tr>
            </tbody></table>
          </div>
        </section>
        <section className="widget">
          <header><span className="w-title">Settings</span></header>
          <div className="body flex flex-col gap-2">
            <table className="tbl"><tbody>
              {settings.map(([k, v]) => <tr key={k}><td>{k}</td><td className="mono whitespace-normal">{v}</td></tr>)}
            </tbody></table>
            {envEntries.length > 0 && (
              <details>
                <summary className="text-[12px] muted">Engine settings (environment, {envEntries.length})</summary>
                <pre className="pre mt-1">{envEntries.map(([k, v]) => `${k}=${v}`).join("\n")}</pre>
              </details>
            )}
          </div>
        </section>
      </div>

      <section className="widget">
        <header><span className="w-title">{c.tower ? "Runs" : "Episodes"}</span><span className="w-actions muted">open one to replay it turn by turn</span></header>
        <div className="body scroll-x">
          <table className="tbl">
            <thead><tr>
              <th className="num">#</th><th>outcome</th><th className="num">final HP</th><th className="num">HP / opt</th>
              <th className="num">{c.tower ? "turns" : "steps"}</th><th className="num">model calls</th><th>replay</th>
            </tr></thead>
            <tbody>
              {c.runs.map((x, i) => (
                <tr key={i}>
                  <td className="num">{x.run ?? i + 1}</td>
                  <td>{c.tower ? <span className="tag tag-info">{x.maxFloor ?? "?"}{x.died ? " · died" : ""}</span>
                    : x.success ? <span className="tag tag-ok">won</span> : x.died ? <span className="tag tag-bad">died</span> : <span className="tag tag-warn">not won</span>}</td>
                  <td className="num">{x.finalHp ?? "–"}</td>
                  <td className="num">{pct(x.hpRatio)}</td>
                  <td className="num">{x.steps ?? "–"}</td>
                  <td className="num">{x.llmCalls ?? "–"}</td>
                  <td>{x.episode ? <Link className="link" href={`/episodes/${x.episode}/`}>replay</Link> : <span className="muted">log not stored</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="widget">
        <header><span className="w-title">Re-run this cell</span></header>
        <div className="body flex flex-col gap-2 text-[13px]">
          {c.rerun.length ? (
            <>
              <p>In a checkout of <a className="link" href={r.source.repo}>mt-ai-lab</a> with an API key set (the result goes to a new file <code>rerun_&lt;time&gt;_{c.label}</code>, never over the thesis result):</p>
              <pre className="pre">{`python scripts/run_catalog.py --codes ${c.rerun.join(" ")}`}</pre>
            </>
          ) : (
            <p className="muted">This cell has no entry in mt-ai-lab&apos;s re-run registry; its settings above and the result file describe how it was run.</p>
          )}
          <p>Result file: <a className="link mono" href={`/data/${c.file}`}>{c.file}</a>{c.updated ? <span className="muted"> · updated {c.updated.slice(0, 10)}</span> : null}</p>
        </div>
      </section>
    </div>
  );
}
