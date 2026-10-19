"use client";
// One prompt-optimisation run, candidate by candidate: score per evaluation, the prompt and its diff to the parent,
// the teacher's diagnosis that wrote it, the validator's verdict and the training episodes it played.
import { useMemo, useState } from "react";
import Link from "next/link";
import { diffStats, wordDiff } from "@/lib/diff";
import type { Candidate, GepaRun } from "@/lib/gepa";

type Tab = "prompt" | "teacher" | "episodes";
const KIND_COLOUR: Record<Candidate["kind"], string> = { seed: "var(--info)", mutation: "var(--gold)", merge: "#A855F7", "re-evaluation": "var(--muted)" };

function Diff({ a, b }: { a: string; b: string }) {
  const parts = useMemo(() => wordDiff(a, b), [a, b]);
  const st = diffStats(parts);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] muted mono">+{st.added} words · −{st.removed} words</span>
      <div className="pre whitespace-pre-wrap text-[13px] leading-relaxed">
        {parts.map((p, i) => p.kind === "same" ? <span key={i}>{p.text}</span>
          : p.kind === "add" ? <ins key={i} className="no-underline bg-[color-mix(in_srgb,var(--ok)_22%,transparent)] text-[var(--text)]">{p.text}</ins>
          : <del key={i} className="bg-[color-mix(in_srgb,var(--bad)_18%,transparent)] text-[var(--muted)]">{p.text}</del>)}
      </div>
    </div>
  );
}

function diagnosis(response: string): string {
  const cut = response.indexOf("```");
  return (cut > 0 ? response.slice(0, cut) : response).trim();
}

function ScoreChart({ run, sel, onSel }: { run: GepaRun; sel: number; onSel: (i: number) => void }) {
  const W = 640, H = 200, P = 34;
  const n = run.candidates.length;
  const x = (i: number) => P + (n <= 1 ? 0 : (i * (W - 2 * P)) / (n - 1));
  const y = (s: number) => H - P + 6 - s * (H - 2 * P);
  const bestLine: [number, number][] = [];
  let b = -Infinity;
  run.candidates.forEach((c, i) => { if (run.method === "(1+1) loop" ? c.score >= b : c.score > b) b = c.score; bestLine.push([x(i), y(b)]); });
  const floors = run.floors;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[760px]" role="img" aria-label="score per candidate">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={P} x2={W - P} y1={y(t)} y2={y(t)} stroke="var(--border-soft)" />
          <text x={P - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">{t.toFixed(2)}</text>
        </g>
      ))}
      <polyline points={bestLine.map(([a, c]) => `${a},${c}`).join(" ")} fill="none" stroke="var(--gold)" strokeOpacity={0.45} strokeDasharray="4 3" />
      {run.candidates.map((c, i) => (
        <g key={i} onClick={() => onSel(i)} className="cursor-pointer">
          {floors.length > 1 && floors.map((f) => c.floorScores[f] != null && (
            <circle key={f} cx={x(i)} cy={y(c.floorScores[f])} r={2.2} fill="var(--muted)" opacity={0.6}><title>{`${f}: ${c.floorScores[f].toFixed(3)}`}</title></circle>
          ))}
          <circle cx={x(i)} cy={y(c.score)} r={i === sel ? 8 : 6} fill={c.kind === "re-evaluation" ? "var(--bg)" : KIND_COLOUR[c.kind]}
                  stroke={i === sel ? "var(--text)" : KIND_COLOUR[c.kind]} strokeWidth={i === sel ? 2 : 1.5} opacity={c.best || c.kind === "seed" ? 1 : 0.55}>
            <title>{`candidate ${i} (${c.kind}): ${c.score.toFixed(3)}${c.best ? " — best so far" : ""}`}</title>
          </circle>
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill={i === sel ? "var(--text)" : "var(--muted)"}>{i}</text>
        </g>
      ))}
    </svg>
  );
}

export function GepaRunView({ run }: { run: GepaRun }) {
  const [sel, setSel] = useState(run.bestIndex);
  const [tab, setTab] = useState<Tab>("prompt");
  const [diffTo, setDiffTo] = useState<"none" | "parent" | "seed">("parent");
  const c = run.candidates[sel];
  const parent = c.parents.length ? run.candidates[c.parents[0]] : null;
  const seed = run.candidates[0];
  const best = run.candidates[run.bestIndex];
  const base = diffTo === "parent" ? parent : diffTo === "seed" ? seed : null;

  return (
    <div className="flex flex-col gap-[var(--gap)]">
      <div className="panel p-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[12px] muted">
          <span>Mean goal score on the training floors per candidate (click to open). Small dots: score per floor; dashed: best so far.</span>
          {(["seed", "mutation", "merge", "re-evaluation"] as const).filter((k) => run.candidates.some((x) => x.kind === k)).map((k) => (
            <span key={k} className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full border" style={{ background: k === "re-evaluation" ? "transparent" : KIND_COLOUR[k], borderColor: KIND_COLOUR[k] }} />{k}</span>
          ))}
        </div>
        <ScoreChart run={run} sel={sel} onSel={setSel} />
      </div>

      <div className="panel flex flex-col min-w-0">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--border-soft)]">
          <button className="btn btn-sm" onClick={() => setSel(Math.max(0, sel - 1))} disabled={sel === 0} aria-label="previous candidate">←</button>
          <b>Candidate {sel}</b>
          <button className="btn btn-sm" onClick={() => setSel(Math.min(run.candidates.length - 1, sel + 1))} disabled={sel === run.candidates.length - 1} aria-label="next candidate">→</button>
          <span className="tag" style={{ color: KIND_COLOUR[c.kind] }}>{c.kind}</span>
          {c.parents.length > 0 && <span className="muted text-[13px]">from {c.parents.map((p) => `candidate ${p}`).join(" and ")}</span>}
          <span className="mono text-[13px]">score {c.score.toFixed(3)}</span>
          {sel === run.bestIndex && <span className="tag tag-ok">returned as the best prompt</span>}
          {run.method === "(1+1) loop" && sel > 0 && (c.best ? <span className="tag tag-info">kept as parent</span> : <span className="tag">dropped (below the best)</span>)}
          {c.rejected && <span className="tag tag-warn">validator rejected the rewrite twice</span>}
          <div className="tabs ml-auto" role="tablist" aria-label="candidate view">
            {(["prompt", "teacher", "episodes"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className="btn btn-sm" onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {tab === "prompt" && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="muted">show</span>
                <select className="input" value={diffTo} onChange={(e) => setDiffTo(e.target.value as typeof diffTo)} aria-label="diff">
                  <option value="parent" disabled={!parent}>changes against the parent</option>
                  <option value="seed" disabled={sel === 0}>changes against the starting prompt</option>
                  <option value="none">the prompt as is</option>
                </select>
                <span className="muted mono">{c.prompt.length.toLocaleString("en")} characters</span>
              </div>
              {base && base !== c ? <Diff a={base.prompt} b={c.prompt} /> : <div className="pre whitespace-pre-wrap text-[13px] leading-relaxed">{c.prompt}</div>}
            </>
          )}
          {tab === "teacher" && (
            c.teacher ? (
              <>
                <p className="muted text-[13px]">
                  The teacher ({run.teacherModel}) read the traces of {parent ? `candidate ${parent.index}` : "the parent"}&apos;s training episodes and wrote this
                  diagnosis, followed by the revised prompt{c.teacher.seconds != null ? ` (${Math.round(c.teacher.seconds)} s)` : ""}.
                </p>
                <div className="pre whitespace-pre-wrap text-[13px] leading-relaxed">{diagnosis(c.teacher.response)}</div>
                <div className="text-[13px]">
                  <b>Validator: </b>
                  {c.teacher.violations.length
                    ? <span className="text-[var(--warn)]">rejected the first rewrite: {c.teacher.violations.join("; ")}</span>
                    : <span className="text-[var(--ok)]">no rule broken</span>}
                </div>
                <details className="text-[13px]"><summary className="cursor-pointer link">the teacher&apos;s full answer</summary>
                  <div className="pre whitespace-pre-wrap mt-2">{c.teacher.response.trim()}</div>
                </details>
              </>
            ) : <p className="muted">{sel === 0 ? "The starting prompt was written by hand, not by the teacher." : c.kind === "re-evaluation" ? "No new candidate: the parent was evaluated again." : "No teacher output stored for this candidate."}</p>
          )}
          {tab === "episodes" && (
            <table className="tbl text-[13px]">
              <thead><tr><th>Floor</th><th>Goal score</th><th>Outcome</th><th>Final HP</th><th>Replay</th></tr></thead>
              <tbody>
                {c.rollouts.map((r, i) => (
                  <tr key={i}>
                    <td className="mono">{r.floor}</td>
                    <td className="mono">{r.score.toFixed(3)}</td>
                    <td>{r.success ? <span className="tag tag-ok">won</span> : <span className="tag">not won</span>}</td>
                    <td className="mono">{r.finalHp ?? "–"}</td>
                    <td>{r.episode ? <Link className="link" href={`/episodes/${r.episode}/`}>open</Link> : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel p-3 flex flex-col gap-2">
        <b>Starting prompt against the returned prompt (candidate {run.bestIndex})</b>
        {run.bestIndex === 0 ? <p className="muted text-[14px]">The run returned its starting prompt unchanged.</p> : <Diff a={seed.prompt} b={best.prompt} />}
      </div>
    </div>
  );
}
