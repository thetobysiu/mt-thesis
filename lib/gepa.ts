// The prompt-optimisation runs of the thesis (Section 6.5): result files of the (1+1) loop and the Pareto loop,
// normalised to one shape, plus the held-out evaluations of the study files. Server only (reads public/data).
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "public", "data", "results");

export type GepaRunMeta = { label: string; study: string; title: string; section: string; note: string; studyFile?: string; arms?: Record<string, string> };

const ARMS1 = { core: "Rules-only", gepa: "Evolved", basic: "Hand-written" };
export const GEPA_RUNS: GepaRunMeta[] = [
  { label: "gs_llama8b_full", study: "Study 1", title: "Llama-3.1-8B, full observation", section: "6.5.2", studyFile: "gs_llama8b_full", arms: ARMS1,
    note: "The optimiser returned its seed: the evolved prompt is byte-identical to the rules-only prompt, so the held-out difference is noise." },
  { label: "gs_llama8b_bare", study: "Study 1", title: "Llama-3.1-8B, bare observation", section: "6.5.2", studyFile: "gs_llama8b_bare", arms: ARMS1,
    note: "The evolved prompt scores below its seed on the held-out floors." },
  { label: "gs_dsv4flash_full", study: "Study 1", title: "DeepSeek-V4-Flash, full observation", section: "6.5.2", studyFile: "gs_dsv4flash_full", arms: ARMS1,
    note: "The one evolved prompt under the full observation that differs from its seed; its training gain did not survive paired re-evaluation." },
  { label: "gs_dsv4flash_bare", study: "Study 1", title: "DeepSeek-V4-Flash, bare observation", section: "6.5.2", studyFile: "gs_dsv4flash_bare", arms: ARMS1,
    note: "The optimiser accepted no revision and returned the seed." },
  { label: "gs2_llama8b_full", study: "Study 1, second configuration", title: "Llama-3.1-8B, full observation", section: "6.5.2", studyFile: "gs2_llama8b_full", arms: ARMS1,
    note: "Richer traces and DeepSeek-V4-Flash as teacher; the optimiser kept the seed." },
  { label: "gs2_llama8b_bare", study: "Study 1, second configuration", title: "Llama-3.1-8B, bare observation", section: "6.5.2", studyFile: "gs2_llama8b_bare", arms: ARMS1,
    note: "Richer traces and DeepSeek-V4-Flash as teacher; the optimiser kept the seed." },
  { label: "gs2_dsv4flash_full", study: "Study 1, second configuration", title: "DeepSeek-V4-Flash, full observation", section: "6.5.2", studyFile: "gs2_dsv4flash_full", arms: ARMS1,
    note: "Richer traces and DeepSeek-V4-Flash as teacher; the optimiser kept the seed." },
  { label: "gs2_dsv4flash_bare", study: "Study 1, second configuration", title: "DeepSeek-V4-Flash, bare observation", section: "6.5.2", studyFile: "gs2_dsv4flash_bare", arms: ARMS1,
    note: "The one accepted rewrite of the second configuration, taken to the paired confirmation: 30/39 against 24/39 for the rules-only prompt (p = 0.035)." },
  { label: "gs5_oneplusone_dsthink_bare", study: "Study 2", title: "(1+1) loop, DeepSeek-V4-Flash with thinking, bare observation", section: "6.5.3", studyFile: "gs5_oneplusone_dsthink_bare", arms: { core: "Rules-only", gepa: "Best of the (1+1) loop" },
    note: "The training score rose, the held-out result fell: overfitting in the sense of hypothesis G4." },
  { label: "gs5_pareto_dsthink_bare", study: "Study 2", title: "Pareto loop, DeepSeek-V4-Flash with thinking, bare observation", section: "6.5.3", studyFile: "gs5_pareto_dsthink_bare", arms: { core: "Rules-only", gepa: "Best of the Pareto loop" },
    note: "All eight candidates scored the same on two of the three training floors, so the frontier held the whole population and gen02 alone chose the parents." },
  { label: "gs4_complex_35b", study: "Complex floor", title: "Qwen3.6-35B from the single-floor prompt", section: "6.5.2", studyFile: "gs4_complex_35b", arms: { seed: "Single-floor prompt", gepa: "Evolved" },
    note: "Pre-registered prediction: no evolved prompt wins this floor. It held: 0/5 for both." },
  { label: "evolved_route_complex_deepseek", study: "Complex floor", title: "Evolving a route without the validator", section: "6.5.4",
    note: "Positions and orders were allowed, yet no candidate named one; one rule forbids the only fight that keeps the boss winnable at turn 9." },
];

export type Rollout = { floor: string; score: number; success: boolean; finalHp: number | null; episode: string | null };
export type Teacher = { response: string; violations: string[]; seconds: number | null };
export type Candidate = {
  index: number; kind: "seed" | "mutation" | "merge" | "re-evaluation"; parents: number[];
  prompt: string; score: number; floorScores: Record<string, number>; rollouts: Rollout[];
  teacher: Teacher | null;           // the reflection that wrote this candidate
  rejected: boolean;                 // the validator rejected the rewrite twice; the parent was evaluated again
  best: boolean;                     // the best prompt so far after this candidate's evaluation
};
export type HeldOutArm = { arm: string; label: string; split: string; n: number; success: number; goal: number };
export type GepaRun = {
  meta: GepaRunMeta; method: "(1+1) loop" | "Pareto loop"; taskModel: string; teacherModel: string; seedFile: string;
  observation: "full" | "bare"; floors: string[]; episodesPerFloor: number; started: string | null;
  candidates: Candidate[]; bestIndex: number; heldOut: HeldOutArm[];
};

type RawRollout = { floor: string; objective: number; success: boolean; final_hp?: number | null; run_log?: string | null };
type RawTeacher = { response?: string; violations?: unknown[]; s?: number } | null | undefined;
type RawIteration = { iteration: number; prompt: string; score: number; rollouts: RawRollout[]; reflection?: RawTeacher; accepted?: boolean; dropped?: boolean };
type RawCandidate = { index: number; kind: string; parents: number[]; prompt: string; score: number; scores: Record<string, number>; rollouts: RawRollout[]; teacher?: RawTeacher };
type RawRun = {
  method: string; task_model: string; reflection_model: string; seed_file: string; bare_obs?: boolean; floors: string[]; rollouts?: number;
  started?: string; iterations?: RawIteration[]; population?: RawCandidate[]; best_index?: number; best_prompt?: string;
};

const floorId = (f: string) => f.replace(/\.txt$/, "");
const rollout = (r: RawRollout): Rollout => ({ floor: floorId(r.floor), score: r.objective, success: !!r.success, finalHp: r.final_hp ?? null,
                                              episode: r.run_log ? r.run_log.replace(/\.json$/, "") : null });
const teacher = (t: RawTeacher): Teacher | null => t?.response ? { response: t.response, violations: (t.violations ?? []).map(String), seconds: t.s ?? null } : null;
function floorScores(rs: Rollout[]): Record<string, number> {
  const m: Record<string, number[]> = {};
  for (const r of rs) (m[r.floor] ??= []).push(r.score);
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
}

function readJson<T>(rel: string): T | null {
  const f = path.join(DATA, rel);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as T) : null;
}

export function getGepaRun(label: string): GepaRun | null {
  const meta = GEPA_RUNS.find((m) => m.label === label);
  const raw = readJson<RawRun>(`gepa/gepa_result_${label}.json`);
  if (!meta || !raw) return null;
  let candidates: Candidate[] = [];
  let bestIndex = 0;
  if (raw.population) {
    candidates = raw.population.map((c) => {
      const rs = c.rollouts.map(rollout);
      return { index: c.index, kind: c.kind === "merge" ? "merge" : c.kind === "seed" ? "seed" : "mutation", parents: c.parents, prompt: c.prompt, score: c.score,
               floorScores: Object.fromEntries(Object.entries(c.scores).map(([k, v]) => [floorId(k), v])), rollouts: rs, teacher: teacher(c.teacher),
               rejected: false, best: false };
    });
    bestIndex = raw.best_index ?? 0;
    let b = -Infinity;
    for (const c of candidates) if (c.score > b) { b = c.score; c.best = true; }
  } else {
    // iteration i's reflection writes candidate i + 1 from the best prompt so far (Algorithm 5.2)
    const its = raw.iterations ?? [];
    let best = -1, bestScore = -Infinity;
    its.forEach((it, i) => {
      const rs = it.rollouts.map(rollout);
      const prev = i > 0 ? its[i - 1] : null;
      const rejected = !!prev && prev.accepted === false;
      const parent = best;
      const c: Candidate = {
        index: i, kind: i === 0 ? "seed" : rejected || (parent >= 0 && it.prompt === its[parent].prompt) ? "re-evaluation" : "mutation",
        parents: i === 0 ? [] : [parent], prompt: it.prompt, score: it.score, floorScores: floorScores(rs), rollouts: rs,
        teacher: prev ? teacher(prev.reflection) : null, rejected, best: false,
      };
      if (it.score >= bestScore) { bestScore = it.score; best = i; c.best = true; }
      candidates.push(c);
    });
    const stored = candidates.findLastIndex((c) => c.best && c.prompt === raw.best_prompt);
    bestIndex = stored >= 0 ? stored : best;
  }
  const heldOut: HeldOutArm[] = [];
  if (meta.studyFile) {
    const s = readJson<{ summary?: Record<string, { n: number; success: number; goal_mean: number }> }>(`gepa_study/${meta.studyFile}.json`);
    const order = Object.keys(meta.arms ?? {});
    for (const [k, v] of Object.entries(s?.summary ?? {})) {
      const [split, arm] = k.split("/");
      if (!meta.arms?.[arm]) continue;
      heldOut.push({ arm, label: meta.arms[arm], split, n: v.n, success: v.success, goal: v.goal_mean });
    }
    heldOut.sort((a, b) => a.split.localeCompare(b.split) || order.indexOf(a.arm) - order.indexOf(b.arm));
  }
  return {
    meta, method: raw.population ? "Pareto loop" : "(1+1) loop", taskModel: raw.task_model, teacherModel: raw.reflection_model, seedFile: raw.seed_file,
    observation: raw.bare_obs ? "bare" : "full", floors: raw.floors.map(floorId), episodesPerFloor: raw.rollouts ?? 1, started: raw.started ?? null,
    candidates, bestIndex, heldOut,
  };
}

/** The paired confirmation of the one accepted rewrite (Section 6.5.2, Figure 6.3). */
export function getConfirmation(): { core: { n: number; success: number; goal: number }; gepa: { n: number; success: number; goal: number } } | null {
  const s = readJson<{ summary?: Record<string, { n: number; success: number; goal_mean: number }> }>("gepa_study/gs3_dsbare_confirm.json");
  const c = s?.summary?.["all/core"], g = s?.summary?.["all/gepa"];
  return c && g ? { core: { n: c.n, success: c.success, goal: c.goal_mean }, gepa: { n: g.n, success: g.success, goal: g.goal_mean } } : null;
}
