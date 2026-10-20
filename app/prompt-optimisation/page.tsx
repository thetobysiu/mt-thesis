import type { Metadata } from "next";
import Link from "next/link";
import { GEPA_RUNS, getConfirmation, getGepaRun, type GepaRun } from "@/lib/gepa";
import { modelName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Prompt optimisation",
  description: "The reflective prompt-optimisation runs of the thesis: every candidate prompt, the teacher's diagnosis, the validator's verdict and the held-out results.",
};

function Spark({ run }: { run: GepaRun }) {
  const W = 120, H = 32, n = run.candidates.length;
  const x = (i: number) => 4 + (n <= 1 ? 0 : (i * (W - 8)) / (n - 1));
  const y = (s: number) => H - 4 - s * (H - 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[120px] h-8" aria-hidden="true">
      <polyline points={run.candidates.map((c, i) => `${x(i)},${y(c.score)}`).join(" ")} fill="none" stroke="var(--muted)" strokeWidth={1} />
      {run.candidates.map((c, i) => <circle key={i} cx={x(i)} cy={y(c.score)} r={i === run.bestIndex ? 3 : 2} fill={i === run.bestIndex ? "var(--gold)" : "var(--muted)"} />)}
    </svg>
  );
}

const cellOf = (run: GepaRun | null, arm: string, split = "test") => run?.heldOut.find((h) => h.arm === arm && h.split === split);

export default function PromptOptimisationPage() {
  const runs = GEPA_RUNS.map((m) => getGepaRun(m.label)).filter((r): r is GepaRun => !!r);
  const byLabel = new Map(runs.map((r) => [r.meta.label, r]));
  const conf = getConfirmation();
  const study1 = [
    ["gs_llama8b_full", "Llama-3.1-8B", "full"], ["gs_llama8b_bare", "Llama-3.1-8B", "bare"],
    ["gs_dsv4flash_full", "DeepSeek-V4-Flash", "full"], ["gs_dsv4flash_bare", "DeepSeek-V4-Flash", "bare"],
  ] as const;
  const groups = [...new Set(GEPA_RUNS.map((m) => m.study))];

  return (
    <div className="page">
      <section className="hero flex flex-col gap-4">
        <span className="eyebrow">Explore · Section 6.5 (RQ2)</span>
        <h1>Prompt optimisation</h1>
        <p className="lead">
          A hosted model can only be changed through its input. These runs evolve the system prompt from task outcomes, in the style of GEPA:
          play, let a teacher read the traces, rewrite, keep what scores at least as well. Every candidate, diagnosis and training episode is here.
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="loop">
        <h2 id="loop">The loop</h2>
        <ol className="grid gap-[var(--gap)] sm:grid-cols-2 lg:grid-cols-5 list-none p-0 m-0">
          {[
            ["Evaluate", "The current prompt plays one episode on each of three training floors (the simple floor, gen01, gen02) at temperature 0; fitness is the mean goal score."],
            ["Build the request", "Scope, a description of the observation, the rules a prompt must follow, the current prompt, one trace per episode and up to two worse rewrites."],
            ["Reflect", "The teacher writes a short diagnosis and one complete revised prompt."],
            ["Validate", "A fixed check rejects coordinates, monster names, routes, lists of allowed fights and numbers of 100 or more; one retry with the reasons."],
            ["Select", "The candidate plays the same floors; it becomes the parent if it scores at least as well as the best so far."],
          ].map(([t, d], i) => (
            <li key={t} className="panel p-3 flex flex-col gap-1">
              <span className="mono text-[12px] text-[var(--gold)]">{i + 1}</span>
              <b className="text-[14px]">{t}</b>
              <span className="muted text-[13px]">{d}</span>
            </li>
          ))}
        </ol>
        <p className="muted text-[13px] max-w-[85ch]">
          This is a (1+1) evolutionary loop. The Pareto loop of the second study keeps every valid candidate, draws parents from those that are best on at
          least one floor, and merges the two best once (Section 5.7, Table 5.2).
        </p>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="study1">
        <h2 id="study1">Study 1: does evolution add anything once the observation is annotated?</h2>
        <p className="max-w-[85ch]">
          Two weaker models, three prompts (rules-only, evolved from it, hand-written single-floor prompt), each under the full and the bare
          observation, evaluated on thirteen held-out generated floors with one episode each. Hypotheses were stated before the runs.
        </p>
        <div className="scroll-x">
          <table className="tbl text-[13px]">
            <thead><tr><th>Model</th><th>Observation</th><th>Rules-only</th><th>Evolved</th><th>Hand-written</th><th>Run</th></tr></thead>
            <tbody>
              {study1.map(([label, model, obs]) => {
                const r = byLabel.get(label) ?? null;
                const f = (arm: string) => { const h = cellOf(r, arm); return h ? `${h.success}/${h.n} · ${h.goal.toFixed(3)}` : "–"; };
                return (
                  <tr key={label}>
                    <td>{model}</td><td>{obs}</td>
                    <td className="mono">{f("core")}</td>
                    <td className="mono">{r && r.bestIndex === 0 ? <span title="the optimiser returned its seed">{f("gepa")} ᵃ</span> : f("gepa")}</td>
                    <td className="mono">{f("basic")}</td>
                    <td><Link className="link" href={`/prompt-optimisation/${label}/`}>candidates</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted text-[12px] mt-1">Held-out kills / 13 · mean goal score (Table 6.6). ᵃ The optimiser returned its seed, so the evolved arm is the rules-only prompt played again: the difference is the noise floor.</p>
        </div>
        <div className="kpis">
          <div className="kpi"><span className="v">≤ 0.132</span><span className="k">difference between two held-out evaluations of the same prompt; differences between candidates inside a run were 0.01 to 0.24</span></div>
          {conf && <div className="kpi"><span className="v">{conf.gepa.success}/{conf.gepa.n} vs {conf.core.success}/{conf.core.n}</span><span className="k">paired test of the one accepted rewrite (bare observation, DeepSeek-V4-Flash) against the rules-only prompt; p = 0.035, carried by two floors and including the four trial floors it was selected on; on the nine other floors 3 : 1, p = 0.31</span><Link className="link" href="/prompt-optimisation/gs2_dsv4flash_bare/">the rewrite</Link></div>}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="rules">
        <h2 id="rules">What the evolved prompts contain</h2>
        <p className="max-w-[85ch]">
          How often the candidates of both studies state each rule of the hand-written prompts, all written from the rules-only prompt by a teacher
          given no example rules (Table 6.7, counted by keyword patterns).
        </p>
        <div className="scroll-x">
          <table className="tbl text-[13px]">
            <thead><tr><th>Rule</th><th>Study 1</th><th>Study 2, (1+1)</th><th>Study 2, Pareto</th><th>In the full observation as</th></tr></thead>
            <tbody>
              {[
                ["collect stat items before the fights they make cheaper ᵇ", "37/40", "7/7", "7/7", "net stat-route line, fight-order line, cost at maximum stats"],
                ["take the cheapest progress first (lowest effective cost)", "26/40", "6/7", "4/7", "effective cost, fight-order line"],
                ["never pay HP for a fight that unlocks nothing needed", "30/40", "7/7", "6/7", "OPTIONAL tag, alternative-route tag"],
                ["open doors only when what lies behind is needed", "14/40", "7/7", "6/7", "DEAD END tag, key line"],
                ["no fight above 40 % of current HP", "3/40", "2/7", "0/7", "—"],
                ["keys are scarce", "0/40", "0/7", "1/7", "key budget"],
                ["added by evolution: trust the engine's annotations", "32/40", "2/7", "3/7", "—"],
                ["added by evolution: fight the boss only when winnable and after the stats", "18/40", "4/7", "1/7", "boss line, WINNABLE tag"],
                ["added by evolution: make the reasoning and the chosen action agree", "8/40", "0/7", "0/7", "—"],
              ].map((r) => <tr key={r[0]}>{r.map((v, i) => <td key={i} className={i > 0 && i < 4 ? "mono" : ""}>{v}</td>)}</tr>)}
            </tbody>
          </table>
          <p className="muted text-[12px] mt-1">ᵇ The rules-only prompt already contains a sentence that the pattern matches, so this row overstates rediscovery.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="runs">
        <h2 id="runs">All runs</h2>
        {groups.map((g) => (
          <div key={g} className="flex flex-col gap-2">
            <h3 className="text-[15px]">{g}</h3>
            <div className="card-grid">
              {runs.filter((r) => r.meta.study === g).map((r) => {
                const gepaTest = cellOf(r, "gepa"), coreTest = cellOf(r, "core");
                return (
                  <Link key={r.meta.label} className="card-link" href={`/prompt-optimisation/${r.meta.label}/`}>
                    <span className="heading text-[14px]">{r.meta.title}</span>
                    <span className="flex items-center gap-3">
                      <Spark run={r} />
                      <span className="mono text-[12px] muted">{r.candidates.length} candidates · best {r.candidates[r.bestIndex].score.toFixed(3)}{r.bestIndex === 0 ? " (seed)" : ""}</span>
                    </span>
                    <span className="muted text-[13px]">{modelName(r.taskModel)} · teacher {modelName(r.teacherModel)} · {r.observation} observation · {r.method}</span>
                    {gepaTest && <span className="text-[13px]">held out: evolved {gepaTest.success}/{gepaTest.n}{coreTest ? `, rules-only ${coreTest.success}/${coreTest.n}` : ""}</span>}
                    <span className="go">§{r.meta.section} · open</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
