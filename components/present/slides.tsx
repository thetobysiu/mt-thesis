"use client";
// The defense deck as web slides. Numbers are those of the revised thesis (chapters_v2); live demos replace screenshots
// where a decision, a search or a result can be shown directly. Notes are the speaker notes, shown in the presenter view.
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Banner, Bul, C, Card, Img, Stat, Switch, Tbl } from "./kit";
import { FloorMap, useMapSkin } from "@/components/FloorMap";
import { SolverExplorer } from "@/components/SolverExplorer";
import { RoutePlayer } from "@/components/RoutePlayer";
import { DamageCalc } from "@/components/tour/DamageCalc";
import { DecisionQuiz } from "@/components/tour/DecisionQuiz";
import { FloorBars, RateBars } from "@/components/tour/Bars";
import { TurnScene } from "@/components/demos/TurnScene";
import { AnnotationFlip } from "@/components/demos/AnnotationFlip";
import { parseFloor } from "@/lib/engine/floor";
import { floorMapData } from "@/lib/engine/mapdata";
import { GRID_FLOORS, MODEL_NAMES, MODELS, type FloorFacts, type PresentData, type Pick } from "@/lib/present-shared";

export type SlideDef = { id: string; title: string; tag?: string; backup?: string; bare?: boolean; notes: string; render: (d: PresentData) => ReactNode };

const QS = [{ id: "q", label: "Qwen3.5-397B", colour: "#F59E0B" }, { id: "s", label: "Qwen3.6-35B", colour: "#38BDF8" }];
const img = (name: string) => `/thesis/img/${name}`;

function Missing() { return <p className="muted">This episode is not in the site data.</p>; }
function Scene({ p, tab, note }: { p: Pick; tab?: "observation" | "reasoning" | "answer"; note?: ReactNode }) {
  return p ? <TurnScene key={`${p.id}-${p.turn}`} id={p.id} turn={p.turn} tab={tab} note={note} /> : <Missing />;
}

/** The simple floor with the decisions of the exact optimal route numbered on their tiles. */
function RouteMap({ f }: { f: FloorFacts }) {
  const [skin] = useMapSkin();
  const map = useMemo(() => floorMapData(parseFloor("simple", f.text)), [f.text]);
  const labels = useMemo(() => {
    const out: Record<string, string> = {};
    let n = 0;
    for (const s of f.solution.exact.route) if (s.kind === "decision") for (const t of s.tiles) out[`${t.x},${t.y}`] = String(++n);
    return out;
  }, [f.solution]);
  return <FloorMap map={map} fit minCell={20} maxCell={52} labels={labels} skin={skin} enemyMetric="hp" />;
}

function MagicTower({ d }: { d: PresentData }) {
  const [calc, setCalc] = useState(false);
  return (
    <div className="grid grid-cols-[480px_minmax(0,1fr)] gap-6 h-full">
      <div className="flex flex-col gap-1 min-h-0">
        <div className="flex-1 min-h-0" data-demo><RouteMap f={d.simple} /></div>
        <span className="text-[12px] muted italic text-center">Simple floor (11 × 11): one winning set, optimum {d.simple.optimum} HP; 1–17 = actions of the optimal route (Table 4.4); numbers on monsters = their HP</span>
      </div>
      <div className="flex flex-col gap-3 min-h-0 relative">
        <Bul size={16}>
          <li>Grid puzzle RPG: the hero (HP, ATK, DEF, keys) fights monsters, opens doors with keys, collects gems and potions.</li>
          <li><b>Fully deterministic</b>: the cost of every fight is known before it starts.</li>
          <li><b>Every resource is irreversible</b>: keys are consumed, HP is lost, monsters and items disappear.</li>
          <li>The <b>order</b> of fights, doors and items decides whether a floor can be won, and with how much HP.</li>
        </Bul>
        <div className="sl-code text-[15px]">{"strikes  T = ⌈ hₘ / (aₕ − dₘ) ⌉        (no damage if aₕ ≤ dₘ)\nHP cost  D = max(0, aₘ − dₕ) · (T − 1)  (+ special abilities)\nh, a, d = HP, ATK, DEF; m = monster, h = hero"}</div>
        <Bul size={15}>
          <li>ATK lowers the number of strikes, DEF lowers every strike: a gem taken <b>before</b> a fight saves more than its face value.</li>
          <li>Simple floor: the boss is unwinnable at ATK 9 and needs ATK ≥ 13; a decision that wastes 13 HP or more loses the floor.</li>
        </Bul>
        <button className="btn btn-sm w-fit" onClick={() => setCalc((v) => !v)}>{calc ? "close" : "try the damage formula"}</button>
        {calc && <div className="absolute inset-0 bg-[var(--bg)] overflow-auto" data-demo><button className="btn btn-sm mb-2" onClick={() => setCalc(false)}>close</button><DamageCalc text={d.simple.text} /></div>}
      </div>
    </div>
  );
}

function ObservationSlide({ d }: { d: PresentData }) {
  const [mode, setMode] = useState<"text" | "quiz">("text");
  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex items-center gap-3">
        <Switch label="view" value={mode} onChange={setMode} options={[["text", "the real input at turn 2"], ["quiz", "you choose: the first decision"]]} />
        <span className="text-[13px] muted">The bare observation (control) keeps the same numbered legal actions with exact costs and removes every annotation.</span>
      </div>
      <div className="flex-1 min-h-0">
        {mode === "text" ? <Scene p={d.picks.firstDecision} tab="observation" note="Qwen3.5-397B, final configuration; the highlighted line is its choice" />
          : <DecisionQuiz text={d.simple.text} replayHref={null} fill />}
      </div>
    </div>
  );
}

function SolverSlide({ d }: { d: PresentData }) {
  const floors = [
    { id: "simple", title: "Simple floor (live search)", text: d.simple.text, optimum: d.simple.optimum, published: d.simple.published },
    { id: "complex", title: "Complex floor", text: d.complex.text, optimum: d.complex.optimum, published: d.complex.published, solution: d.complex.solution },
  ];
  return <SolverExplorer floors={floors} layout="stage" />;
}

function MainResults({ d }: { d: PresentData }) {
  const [open, setOpen] = useState<{ label: string; run: number } | null>(null);
  const cell = open ? d.grid[open.label] : null;
  const run = cell?.runs[open!.run];
  if (cell && run) {
    return (
      <div className="flex flex-col gap-2 h-full min-h-0" data-demo>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <button className="btn btn-sm" onClick={() => setOpen(null)}>◀ back to the table</button>
          <b className="mono">{cell.label}</b><span className="muted">{cell.k}/{cell.n} won · episode:</span>
          {cell.runs.map((r, i) => (
            <button key={r.id} className={`btn btn-sm ${i === open!.run ? "btn-primary" : ""}`} onClick={() => setOpen({ label: cell.label, run: i })}>
              {i + 1} {r.won ? "✓" : "✗"}
            </button>
          ))}
          <Link className="link ml-auto" href={`/results/${cell.label}/`}>result cell</Link>
        </div>
        <div className="flex-1 min-h-0"><TurnScene key={run.id} id={run.id} turn={run.turn} tab="reasoning" /></div>
      </div>
    );
  }
  const opt: Record<string, string> = { simple: "13", complex: "68", "complex-route": "68", hand01: "14", hand02: "13", hand03: "9", hand04: "3" };
  const tower: Record<string, string> = { "qwen3.5-397b": "MT18", "deepseek-v4-flash": "MT17", "qwen3.6-35b": "MT16", "mistral-medium-3.5": "MT8" };
  return (
    <div className="flex flex-col gap-3 h-full">
      <table className="sl-tbl text-[14px]">
        <thead>
          <tr><th>Agent</th>{GRID_FLOORS.map((f) => <th key={f.id} className="c whitespace-pre-line">{f.title}</th>)}<th className="c">Tower</th></tr>
        </thead>
        <tbody>
          <tr className="muted"><td>Exact optimum (HP)</td>{GRID_FLOORS.map((f) => <td key={f.id} className="c mono">{opt[f.id]}</td>)}<td className="c">–</td></tr>
          <tr><td>Rule-based heuristic</td>{GRID_FLOORS.map((f) => <td key={f.id} className="c mono muted">{f.id === "complex-route" ? "–" : "0/1"}</td>)}<td className="c mono">MT8</td></tr>
          <tr><td>Random play</td>{GRID_FLOORS.map((f) => <td key={f.id} className="c mono muted">{f.id.startsWith("hand") ? "0/500" : "–"}</td>)}<td className="c">–</td></tr>
          {MODELS.map((m) => (
            <tr key={m}>
              <td><b>{MODEL_NAMES[m]}</b></td>
              {GRID_FLOORS.map((f) => {
                const c = d.grid[f.cell(m)];
                if (!c) return <td key={f.id} className="c muted">–</td>;
                const p = c.k / c.n;
                return (
                  <td key={f.id} className="c" style={{ background: `color-mix(in srgb, var(--ok) ${Math.round(p * 40)}%, transparent)` }}>
                    <button className="mono underline decoration-dotted underline-offset-2 cursor-pointer" title="open the episodes of this cell"
                            onClick={() => setOpen({ label: c.label, run: Math.max(0, c.runs.findIndex((r) => !r.won && c.k < c.n)) })}>
                      {c.k}/{c.n}{c.ratio != null && c.k ? <span className="muted"> ({c.ratio.toFixed(2)})</span> : null}
                    </button>
                    {c.died ? <span className="text-[var(--bad)] text-[11px]"> †{c.died}</span> : null}
                  </td>
                );
              })}
              <td className="c mono">{tower[m]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] muted m-0">k/N successes (HP/opt among wins) · † deaths · solver-route prompt run without mechanical overrides and automatic 0-HP fights · Tower: highest floor, best of three runs · temperature 0. <b>Click a cell</b> to open its episodes at the first decision: map, input, reasoning and the move.</p>
      <div className="grid grid-cols-3 gap-3 mt-auto">
        <Stat c={C.green} v="15/15" k="Qwen3.5-397B, simple floor [0.80, 1.00]; every win at 2 HP: the Slime Lord (1,9) is taken before the Bat (3,5) at turn 15 (optimum 13)" size={30} />
        <Stat c={C.blue} v="all · none" k="hand01 and hand02 won by every model; hand03 and hand04 by none (0/20 each)" size={30} />
        <Stat c={C.red} v="0/20" k="complex floor, general prompt; 3 of 4 models win with the solver's route" size={30} />
      </div>
    </div>
  );
}

function ReasoningSlide({ d }: { d: PresentData }) {
  const [v, setV] = useState<"before" | "after" | "order">("before");
  const p = v === "before" ? d.picks.turn9Before : v === "after" ? d.picks.turn9After : d.picks.orderLine35;
  const note = v === "before" ? "row 2: one-sided lines; the Slime Lord makes the boss unwinnable" : v === "after" ? "row 4: two-sided lines; the door (7,0) keeps 13 HP" : "row 8: the unguarded positive order line, read as \"a direct instruction from the engine\"";
  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex flex-wrap items-center gap-3">
        <Switch label="episode" value={v} onChange={setV} options={[["before", "before the repair (turn 9)"], ["after", "after the repair (turn 9)"], ["order", "Qwen3.6-35B, row 8 (turn 4)"]]} />
        <span className="text-[13px] muted">Same model, same state; switch to the observation tab to see the line it cites.</span>
      </div>
      <div className="flex-1 min-h-0"><Scene p={p} tab="reasoning" note={note} /></div>
    </div>
  );
}

function ComplexSlide({ d }: { d: PresentData }) {
  const [v, setV] = useState<"chart" | "loss" | "route">("chart");
  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex flex-wrap items-center gap-3">
        <Switch label="view" value={v} onChange={setV} options={[["chart", "state values (Figure 6.2)"], ["loss", "the losing fight"], ["route", "a win with the route in the prompt"]]} />
      </div>
      {v === "chart" ? (
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5 flex-1 min-h-0">
          <Img src={img("6.2.png")} alt="Exact state value along the complex-floor episodes" caption="Exact state value after each turn; left single-floor prompt, right solver-route prompt" />
          <div className="flex flex-col gap-3">
            <Card t="Single-floor prompt" c={C.red} size={15}>
              <Bul size={15}>
                <li><b>0/20</b> in the re-run; all <b>30</b> analysed episodes lost at a single fight: <b>29 at the Red Slime (11,8)</b>, turn 9 or 12.</li>
                <li>The cheapest fight on offer; free at DEF 20 (the optimal route takes it 12th, for 11 HP).</li>
                <li>The observation carried both sides; the model: &quot;the cheapest meaningful progress&quot;.</li>
                <li><b>Visible ≠ decisive</b>: the trap door (10,5) was opened in 17/20 episodes, but only after the loss.</li>
              </Bul>
            </Card>
            <Bullets15>
              <li><b>Solver-route prompt</b> (no mechanical overrides): 11/25 wins, all ≤ 22 HP; exact-route prompt: Qwen3.6-35B 2/5 at 58 HP.</li>
              <li><b>hand03 / hand04</b>: 0/20 each.</li>
            </Bullets15>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0"><Scene p={v === "loss" ? d.picks.complexLoss : d.picks.routeWin} tab="observation"
          note={v === "loss" ? "Qwen3.5-397B, single-floor prompt: the Red Slime (11,8), after which the boss is unwinnable" : "DeepSeek-V4-Flash, solver-route prompt"} /></div>
      )}
      <Banner>Models follow a given order of doors and fights; none derives a multi-step order from per-state annotations</Banner>
    </div>
  );
}
const Bullets15 = ({ children }: { children: ReactNode }) => <Bul size={15}>{children}</Bul>;

const FEATURES: [string, string, string][] = [
  ["/walkthrough/", "3-minute walkthrough", "the whole thesis as one animated story"],
  ["/episodes/", "Episodes", "every stored episode, turn by turn, with input and reasoning"],
  ["/compare/", "Compare", "a win and a loss, opened where they first differ"],
  ["/solver/", "BFS solver", "the exact search step by step; 22 vs 68"],
  ["/results/", "Results", "every cell behind the thesis tables, with settings and episodes"],
  ["/prompt-optimisation/", "Prompt optimisation", "every candidate, diagnosis and verdict"],
  ["/play/", "Play", "any single floor with the exact value of every action"],
  ["/game/", "Tower game", "the original 24-floor game in English"],
  ["/thesis/", "Thesis", "the full text, linked to the result cells, and the PDF"],
];

export const SLIDES: SlideDef[] = [
  {
    id: "title", title: "From Reactive Control to Holistic Planning", bare: true,
    notes: `[0:30] Good morning / afternoon. Thank you for being here.
My thesis asks how a language-model agent should be built for long-horizon decisions that cannot be undone:
what it gains from a better observation, a better prompt, or a longer plan.
I will spend about 30 minutes: first the setting and the agent, then one block per research question,
then the tower, the methodological lessons, limitations and the conclusion. I have backup slides for details.`,
    render: () => (
      <div className="slide sl-dark justify-center" style={{ padding: "60px 80px" }}>
        <div className="w-[130px] h-[5px] rounded bg-[var(--gold)]" />
        <h1 className="text-[46px] leading-tight m-0 text-white">From Reactive Control to Holistic Planning</h1>
        <p className="text-[24px] m-0 text-[#D6DEEB]">Evolutionary Prompt Optimization for Hybrid Deterministic-Neural Agents in Long-Horizon Environments</p>
        <div className="mt-8 flex flex-col gap-1 text-[18px] text-[#D6DEEB]">
          <b className="text-white text-[24px]">King Wai Siu</b>
          <span>Master&apos;s thesis · Management &amp; Data Science</span>
          <span>Leuphana University Lüneburg · Institute of Information Systems</span>
          <span>Artificial Intelligence and Explainability Research Group</span>
          <span className="mt-3">Supervisor: Prof. Dr. Ricardo Usbeck · Second supervisor: Prof. Dr. Burkhardt Funk</span>
        </div>
        <span className="mt-auto text-[#F2C28B] text-[16px]">Thesis defense</span>
      </div>
    ),
  },
  {
    id: "roadmap", title: "Roadmap",
    notes: `[0:20] The talk follows the thesis. After motivation and questions I describe the agent, the game, the exact
solver and the evaluation protocol. Then the three research questions in order: the observation, prompt
optimisation and the planning horizon. The 24-floor tower comes after that, because it combines all three.
I close with what went wrong in the measurements themselves, the limitations, and the answers.`,
    render: () => (
      <ol className="m-0 p-0 list-none flex flex-col gap-4 mt-4">
        {([["Motivation, research questions, positioning", "Ch. 1, 3", C.muted], ["The hybrid agent, Magic Tower, exact solver, evaluation protocol", "Ch. 4, 5", C.muted],
          ["RQ1 · Observation: what the engine's annotations contribute", "§6.2–6.4", C.blue], ["RQ2 · Prompt optimisation: evolved vs. hand-written vs. rules-only", "§6.5", C.green],
          ["RQ3 · Planning horizon: reactive vs. committed plans", "§6.6", C.orange], ["The 24-floor tower", "§6.7.3", C.muted],
          ["Methodological lessons, limitations, answers, future work", "Ch. 7", C.muted]] as [string, string, string][]).map(([t, ref, c], i) => (
          <li key={i} className="flex items-center gap-4 text-[21px]">
            <span className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-[18px] shrink-0" style={{ background: c === C.muted ? "var(--panel-2)" : c, color: c === C.muted ? "var(--text)" : "#0B1220" }}>{i + 1}</span>
            <span className="flex-1">{t}</span><span className="muted text-[16px]">{ref}</span>
          </li>
        ))}
      </ol>
    ),
  },
  {
    id: "motivation", title: "Motivation: LLM agents meet irreversible decisions", tag: "Introduction",
    notes: `[1:15] LLM agents such as ReAct or Reflexion act over many steps, and benchmarks like BALROG measure how far they get.
But most of those tasks forgive mistakes: a wrong click can be undone.
Many real planning problems do not: resources are spent irreversibly, and a decision at step five can make
step forty impossible, while the quality of a decision only shows much later.
On classical planning problems, LLMs on their own produce few valid plans (Valmeekam et al.). The response
has been to pair the model with exact components: planners, verifiers, LLM-Modulo.
That raises three questions, and they are the three research questions: what does the exact component
contribute; does automatic prompt optimisation help, which is the only lever we have on a hosted model;
and should the agent react at every step or commit to a plan?
To answer them we need an environment where every decision can be scored against an exact optimum.`,
    render: () => (
      <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6 flex-1">
          <Bul size={19} gap={14}>
            <li>LLM agents act over many steps: ReAct, Reflexion; benchmarks such as BALROG measure how far they get.</li>
            <li>Most benchmark tasks forgive mistakes. Real planning often does not: <b>resources are spent irreversibly</b> and <b>consequences appear late</b>.</li>
            <li>LLMs planning alone produce few valid plans in classical planning domains (Valmeekam et al., 2023).</li>
            <li>Response: pair the model with <b>exact components</b>: planners, verifiers (LLM+P, Liu et al., 2023; LLM-Modulo, Kambhampati et al., 2024).</li>
          </Bul>
          <div className="flex flex-col gap-3">
            <Card t="1 · The exact component" c={C.blue}>What does the engine&apos;s computed information contribute?</Card>
            <Card t="2 · The prompt" c={C.green}>Does automatic prompt optimisation help? The only lever on a hosted model (GEPA, Agrawal et al., 2025).</Card>
            <Card t="3 · The horizon" c={C.orange}>React at every step, or commit to a plan of several actions?</Card>
          </div>
        </div>
        <Banner>Needed: an environment where every decision can be measured against an exact optimum</Banner>
      </div>
    ),
  },
  {
    id: "magic-tower", title: "Testbed: Magic Tower", tag: "Task and environment",
    notes: `[1:30] Magic Tower is a grid puzzle role-playing game. The hero has HP, attack, defence and keys. Monsters block
tiles until defeated, doors need a key of their colour, which is consumed, gems raise attack or defence,
potions restore HP.
Two properties make it a clean testbed: it is fully deterministic, so the cost of every fight is known in advance,
and every resource is irreversible. So the order in which you take fights, doors and items decides whether
the floor is winnable at all, and with how much HP.
The combat rule is one formula: the hero needs T strikes, the monster strikes T-1 times. Each ATK point lowers
the number of strikes, each DEF point lowers every strike. So a gem taken before a fight saves more than its
face value. On the simple floor, shown here, the boss cannot be damaged with ATK 9; you need 13. This floor has exactly
one winning set of fights and an optimum of 13 HP; the numbers mark the seventeen actions of the optimal route.
A decision that wastes 13 HP or more loses the floor: that is its slack.
DEMO: "try the damage formula" opens the calculator on this floor's monsters.`,
    render: (d) => <MagicTower d={d} />,
  },
  {
    id: "rqs", title: "Research questions and hypotheses", tag: "Introduction",
    notes: `[1:15] Three research questions, each attached to one part of the agent.
RQ1 is about the observation: does engine grounding, meaning enumerated actions, exact costs and lookahead
annotations, make the agent win floors that a rule-based heuristic and the same model without annotations lose?
RQ2 is about the prompt: when does evolutionary prompt optimisation help, compared with a hand-written prompt and
a prompt that only states the rules, and does that depend on the observation? My hypothesis was that with
annotations present it adds nothing beyond run-to-run noise.
RQ3 is the planning horizon, from one action per call to one plan for the whole floor. Hypothesis: committing
saves calls but costs success when the order must be derived from facts that only appear state by state.
I also stated three rival explanations in advance; I come back to them at the end.`,
    render: () => (
      <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-3 gap-4 flex-1">
          {([["RQ1 · Observation", C.blue, "How does engine grounding (enumerated actions, exact costs, lookahead annotations) influence success, relative to a rule-based heuristic and to the same model without annotations?",
              "HA: with the annotations, assists and only mechanical overrides, the agent wins floors that the heuristic and the bare-observation model do not win.", "simple floor: final configuration vs. bare vs. heuristic"],
            ["RQ2 · Prompt optimisation", C.green, "When does evolutionary prompt optimisation improve the agent, relative to a hand-written and a rules-only prompt, and how does this depend on the observation?",
              "HB: with annotations present, an evolved prompt does not exceed the hand-written or rules-only prompt by more than the variation between two runs of the same prompt.", "13 held-out floors, noise floor measured"],
            ["RQ3 · Planning horizon", C.orange, "How does the horizon, from one action per call to one plan for the whole floor, affect success and cost on floors of different structure?",
              "HC: committing to several actions per call lowers the number of calls but also success when the order must be derived from annotations that appear state by state.", "each planning mode vs. its own reactive arm"]] as [string, string, string, string, string][])
            .map(([t, c, q, h, test]) => (
              <Card key={t} t={t} c={c} size={15}>
                <span>{q}</span>
                <b className="mt-2 text-[14px]" style={{ color: c }}>Hypothesis</b>
                <span className="text-[14px]">{h}</span>
                <span className="text-[12px] muted mt-auto">Test: {test}</span>
              </Card>
            ))}
        </div>
        <Banner>Rival explanations, tested in Ch. 7.2: <b>R1</b> service non-determinism · <b>R2</b> luck of single episodes · <b>R3</b> engine overrides produce the wins</Banner>
      </div>
    ),
  },
  {
    id: "positioning", title: "Positioning against the closest work", tag: "Related work · Table 3.1",
    notes: `[0:40] Briefly where this sits. Game-agent benchmarks like BALROG run repeated episodes, but in stochastic
environments without an optimum. LLM+P has an exact optimum but no repeated runs and no prompt optimisation.
GEPA and Naive Prompt Optimization optimise prompts, but on short tasks with cheap repeatable scores.
And where observations are varied in the literature, it is their format, not the computed consequences of actions.
None of the closest works combines the six properties, which is what allows the contributions of observation,
prompt and horizon to be separated here.`,
    render: () => {
      const Y = "✓", N = "✗";
      const rows: string[][] = [["Work", "Deterministic", "Exact optimum", "Repeated runs", "Prompt optimisation", "Planning horizon", "Engine-annotated observation"],
        ["BALROG (Paglieri et al., 2025)", N, N, Y, N, N, N], ["Agentick (Castanyer et al., 2026)", N, N, Y, N, N, N], ["Voyager (Wang et al., 2023)", N, N, Y, N, N, N],
        ["HexMachina (Belle et al., 2025)", N, N, Y, `${N} (evolves code)`, N, N], ["Magic Tower report (Weng, 2025)", N, N, N, N, N, N], ["ReWOO (Xu et al., 2023)", "n/a", "n/a", N, N, Y, N],
        ["LLM+P (Liu et al., 2023)", Y, Y, N, N, N, N], ["GEPA (Agrawal et al., 2025)", "n/a", "n/a", N, Y, N, N], ["Naive Prompt Optimization (Chang & Chen, 2026)", "n/a", "n/a", N, Y, N, N],
        ["This thesis", Y, Y, Y, Y, Y, Y]];
      return (
        <div className="flex flex-col gap-3">
          <Tbl rows={rows} size={13.5} fill={(r) => (r === 10 ? "good" : undefined)} />
          <Bul size={15}>
            <li>Game-agent studies: mostly stochastic, no optimum; the observation is varied in <b>format</b>, not in the <b>computed consequences</b> of actions.</li>
            <li>Prompt optimisers are evaluated on short tasks with cheap, repeatable scores.</li>
            <li>Grounding work verifies what the model <b>outputs</b> rather than shaping what it <b>sees</b>.</li>
          </Bul>
        </div>
      );
    },
  },
  {
    id: "agent", title: "The hybrid agent: the engine computes, the model chooses", tag: "Method · Ch. 5",
    notes: `[1:15] This is the agent. The engine reads the game state and computes everything that can be computed exactly:
which targets are reachable, the exact damage of every fight, and a lookahead of up to three gateways deep.
It writes this into a numbered list of legal actions with annotations. The model receives the system prompt,
the state and that list, reasons, and answers with one number. It never plans a tile path, so it cannot
target something that does not exist.
The engine then validates and executes. It takes trivial decisions itself, collecting items and fighting
monsters that cost nothing, and it overrides only mechanically useless choices: a dead-end door, an
unwinnable or a lethal fight. Every override is logged. Strategic overrides are off in the final configuration.
The three research questions attach to the three coloured places: the observation, the prompt, and how many
actions the model commits per call.`,
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        <Img src={img("5.1.jpg")} alt="The hybrid agent" className="flex-1" />
        <div className="grid grid-cols-2 gap-6">
          <Bul size={15}>
            <li><b>Engine</b>: reachability, exact damage, lookahead (depth 3; tower 2), annotations.</li>
            <li><b>Model</b>: one number per call (FINAL_CHOICE: n), never a tile path: it can only pick legal actions.</li>
          </Bul>
          <Bul size={15}>
            <li><b>Assists</b>: collect items and keys, 0-HP fights. <b>Mechanical overrides</b> only (dead-end door, unwinnable, lethal), each logged.</li>
            <li><b>Two system prompts</b> (single floor, tower): rules, how to read annotations, general strategy; no floor-specific knowledge.</li>
          </Bul>
        </div>
      </div>
    ),
  },
  {
    id: "observation", title: "What the model sees: the annotated action list", tag: "Method · Listing 5.1",
    notes: `[1:30] This is the actual observation at the first decision on the simple floor, the real input of a winning episode.
The engine has already collected the key next to the start, so this is turn 2. The state block gives HP and keys, a key budget,
whether the boss is winnable now and what ATK it needs, and an HP budget at maximum stats.
Then the numbered actions. Each fight carries its exact damage, a status tag and an effective cost; the Black Slime
is the only one with a numeric effective cost, the Red Slime is tagged as an alternative route to it, and the
door as a dead end. Two lines matter most for the results: the net stat-route line and the fight-order line. And key lines.
Exact versus heuristic: damage, tags, tree and key lines are exact; the route lines compare exact costs, and the
order line is advice; the lookahead value and effective cost use hand-set weights.
DEMO: switch to "you choose" and let the audience pick; the exact solver checks all four outcomes.
At this first decision, 19 of 20 re-run episodes fought the Black Slime, the only choice that keeps a win reachable.`,
    render: (d) => <ObservationSlide d={d} />,
  },
  {
    id: "solver", title: "Exact optimum for every single floor", tag: "Task and environment · §4.5–4.6",
    notes: `[1:00] Every single floor has an exact optimum, computed by a breadth-first solver over sets of removed obstacles.
I started from the published solver of the game's AI repository. Its dominance test kept the first state reached
for each set of removed obstacles. The set fixes every attribute except HP, so the exact test keeps the state with
the most HP per set; with it, the complex floor's optimum is 68 HP, not the 22 HP the published solver reports.
That matters: wins at 22 HP are a third of the optimum.
DEMO: step / +10 / run to the end on the simple floor (412 states, 13 HP), then the published search; then the complex
floor's stored exact and published routes (68 vs 22). The 45-decision cap never binds (at most 32 monster/door nodes).
The floors: the simple floor is where the observation was developed and the running example; the complex floor is
the boundary; four hand-designed floors were built with the solver to have exactly one winning set of fights, a
small slack, and to defeat the heuristic and random play; fifteen generated floors serve prompt optimisation;
and the 24-floor tower is the long-horizon test.`,
    render: (d) => <SolverSlide d={d} />,
  },
  {
    id: "protocol", title: "Evaluation protocol", tag: "Method · §5.9, §6.1",
    notes: `[1:00] Every configuration is run repeatedly from the same initial state: five episodes per cell in the main table,
ten in the repair sequence and the ablations. I report the success rate with a Wilson 95 % interval and, among
the wins, the final HP relative to the exact optimum. Tower runs are reported by the highest floor reached.
The final configuration is fixed: temperature 0, lookahead depth 3, no conversation history, all annotations,
and one constrained-decoding repair if an answer cannot be parsed. Every override is logged, and a win is
attributed to the model only if no strategic override occurred. Every episode is stored as a complete log.
Four models carry the main results, all through the GWDG SAIA service; two weaker models are used in the
prompt-optimisation study. Baselines: the rule-based heuristic on the same engine output, random play, and
the exact optimum.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6">
        <Bul size={16} gap={11}>
          <li><b>Repeated episodes</b> from the same initial state: N = 5 per cell (main table), N = 10 (repair sequence, ablations); tower: 1–5 runs per configuration.</li>
          <li><b>Success rate</b> k/N with <b>Wilson 95 % interval</b>; <b>HP/opt</b> among successes; tower: highest floor.</li>
          <li><b>Final configuration</b>: temperature 0 · lookahead depth 3 (tower 2) · no conversation history · all annotations · one constrained-decoding repair for unparseable answers.</li>
          <li><b>Every override logged</b>; a win counts for the model only without a strategic override.</li>
          <li><b>Every episode stored</b>: observation, reasoning, answer, executed action (all on this site).</li>
          <li><b>Baselines</b>: rule-based heuristic (same engine output, fixed rules) · random play (500 games per hand floor) · exact optimum.</li>
        </Bul>
        <div className="flex flex-col gap-2">
          <Tbl size={14} rows={[["Model", "Architecture", "Reasoning"], ["Qwen3.5-397B", "MoE, 17 B active", "thinking"], ["DeepSeek-V4-Flash", "MoE 284 B, 13 B active", "thinking"],
            ["Qwen3.6-35B", "MoE, 3 B active", "thinking"], ["Mistral Medium 3.5", "128 B", "none"], ["Llama-3.1-8B ¹", "dense", "none"],
            ["DeepSeek-V4-Flash ¹", "MoE 284 B, 13 B active", "none"], ["Qwen3.8-27B ²", "dense", "thinking"]]} />
          <span className="text-[12px] muted">¹ prompt-optimisation study only · ² planning study only · all via the GWDG SAIA service</span>
        </div>
      </div>
    ),
  },
  {
    id: "main-results", title: "Main results (Table 6.2)", tag: "RQ1 · Results",
    notes: `[1:30] The main table, all on the final version of the code. Rows are agents, columns are floors; the cells show
successes out of episodes and, in parentheses, the final HP relative to the optimum among the wins.
Three things to take from it. First, Qwen3.5-397B wins every simple-floor episode, 5 of 5 here and 15 of 15
across both runs, interval 0.80 to 1. But always at 2 HP, against an optimum of 13: it wins, it does not play
optimally. The other models win the simple floor at most once in five.
Second, the hand-designed floors split cleanly: hand01 and hand02 are won by every model; hand03 and hand04 by none.
Third, the complex floor is never won from the general prompt, 0 of 20, but three of four models win it when the
published solver's route is written into the prompt. The heuristic wins none of the six fixed floors, and
reaches MT8 on the tower, where the best model reaches MT18.
DEMO: click any cell to open its episodes; it opens a failed episode where there is one.`,
    render: (d) => <MainResults d={d} />,
  },
  {
    id: "overrides", title: "First, a correction: silent overrides produced the early wins", tag: "RQ1 · §6.4.1",
    notes: `[1:15] Before I could trust any of these numbers, I found a problem in my own setup. The development loop had a
strategic override: whenever the heuristic judged another action much cheaper, the engine silently executed
the heuristic's action instead of the model's. It was not logged.
Going back through the stored episodes: in 94 turns of 68 simple-floor episodes the executed action differed
from the model's choice. Every one of the 21 early wins contained such a replacement, 17 of them at the same
turn 9, where the model chose a Slime Lord and the engine opened a door instead. When I re-enabled the override
deliberately and logged it, the result was 2 of 4, both wins again containing it. Removed, it was 0 of 5.
So for the early results, rival explanation R3 was simply true. From then on, overrides are mechanical only and
logged, and no win of the final configuration contains a strategic override.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <Bul size={17} gap={13}>
          <li>The development loop replaced the model&apos;s choice with the heuristic&apos;s whenever it judged another action much cheaper, <b>without logging it</b>.</li>
          <li><b>94 turns in 68 stored simple-floor episodes</b>: executed action ≠ model&apos;s choice.</li>
          <li><b>21 of 21 early wins</b> contained such a replacement; 17 at turn 9 (model: Slime Lord (1,9) → engine: door (7,0)).</li>
          <li>Re-enabled deliberately and logged: <b>2/4</b>, both wins again containing it.</li>
          <li>Fix: overrides reduced to <b>mechanical cases</b> (dead-end door, unwinnable, lethal), each logged with the model&apos;s choice and the reason.</li>
        </Bul>
        <div className="flex flex-col gap-3">
          <Stat c={C.red} v="21 / 21" k="early wins contained a silent strategic override" />
          <Stat c={C.muted} v="0/5" k="once removed: single-floor prompt, mechanical assists only (Table 6.5, row 2)" />
          <Card t="R3 (overrides produce the wins)" c={C.blue} size={15}>correct for the early results; excluded for the final configuration: no win contains a strategic override.</Card>
        </div>
      </div>
    ),
  },
  {
    id: "one-sided", title: "One-sided annotations: a class of observation defects", tag: "RQ1 · Contribution 1 · §6.4.2",
    notes: `[1:15] Reading the reasoning of the failed episodes, I found the same pattern again and again. The written reasoning cited
an annotation, and the annotation showed only one side of a trade-off.
DEMO: the clearest case, turn 9 of the simple floor; the hero stands at the far end of the lower-left room with
two keys. One-sided: the stat items behind door 7,5 save 155 HP, those behind door 7,0 save 94. The model picked
the Slime Lord, whose effective cost of minus 195 counted a potion. Switch to two-sided: the cost of reaching the
items is stated, 198 HP of fighting against 16, the net is minus 43 against plus 78, and 7,0 is the optimal route.
Show the exact outcome.
I found five kinds: a saving without its cost, a value without its cost, an efficiency without affordability,
a deficit without scope, and a count without multiplicity. The repair was always in the engine: state the missing side.
Model and prompt unchanged. The reasoning text is not proof of the internal process; the intervention is the evidence.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-5 h-full min-h-0">
        {d.flip ? <AnnotationFlip {...d.flip} /> : <Missing />}
        <div className="flex flex-col gap-3 min-h-0">
          <b className="text-[16px] text-[var(--info)]">Five kinds found in the failure traces</b>
          <Bul size={14.5} gap={7}>
            <li><b>Saving without its cost</b>: &quot;save 155 HP&quot;, but reaching it costs 198 HP.</li>
            <li><b>Value without its cost</b>: a potion counted as fight value (effCost −195), though it is collected in any order.</li>
            <li><b>Efficiency without affordability</b>: &quot;take this fight before …&quot; recommended a Bat at 46.5 % of HP, above the 40 % limit; the model followed it.</li>
            <li><b>Deficit without scope</b>: &quot;CANNOT WIN even with all gems&quot; on a winnable floor (optional monsters summed).</li>
            <li><b>Count without multiplicity</b>: two gems behind one door shown as one.</li>
          </Bul>
          <Card t="Repair" c={C.green} size={15}>state the missing side <b>in the engine</b>; model and prompt unchanged.</Card>
        </div>
      </div>
    ),
  },
  {
    id: "repair", title: "Repairing the observation: 0/5 → 10/10", tag: "RQ1 · Table 6.5 · Figure 6.1",
    notes: `[1:15] This is the repair sequence, cumulative from top to bottom, on the simple floor. Row 2 is the single-floor
prompt with only mechanical assists: zero of five. Row 3 adds an alternative-route tag: still zero.
Row 4 adds two lines, the net stat-route line and the fight-order line, both two-sided. With model, prompt,
temperature and depth all fixed, Qwen3.5-397B goes from 0 of 5 to 10 of 10; the intervals do not overlap.
Two further observations. Repairs can introduce new one-sided lines: in row 8, a positive order line, "take
this fight before", had no affordability guard, and the smaller model followed it as an instruction into a
fight costing 46 % of its HP, 1 of 10. And removing conversation history raised Qwen3.6-35B from 1 of 5 to 10 of
10; the six previous turns were about three quarters of every request.
The final configuration, row 9: 10 of 10 and 7 of 10. Each bar links to its result cell.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <RateBars rows={d.repair} groups={QS} caption="Cumulative repair sequence (Table 6.5); bars k/N with Wilson 95 % whiskers; each row adds its change to the row above." />
        <div className="flex flex-col gap-3">
          <Stat c={C.green} v="0/5 → 10/10" k="row 4: + net stat-route and fight-order lines; same model, prompt, temperature, depth. [0.00, 0.43] → [0.72, 1.00]" size={30} />
          <Bul size={15} gap={9}>
            <li><b>Repairs can create new one-sided lines</b>: row 8&apos;s positive order line had no 40 % guard and was followed as an instruction (Qwen3.6-35B 1/10).</li>
            <li><b>No conversation history</b> (row 7): Qwen3.6-35B 1/5 → 10/10; history was ≈ ¾ of every request.</li>
            <li><b>Final configuration</b> (row 9): Qwen3.5-397B 10/10, Qwen3.6-35B 7/10.</li>
          </Bul>
        </div>
      </div>
    ),
  },
  {
    id: "reasoning", title: "Same model, same state, different observation", tag: "RQ1 · Listings 6.1 and 6.2",
    notes: `[1:00] What does this look like inside the model? Same model, same state, turn 9, 336 HP. Before the repair, the
reasoning dismisses door 7,0 as a dead end and picks the Slime Lord because its effective cost of minus 195 is
"the best value on the board". Every premise of that reasoning came from the input. After the repair, the same
model cites the new lines: 16 HP to reach the ATK gem, net plus 78, and that the Slime Lord wastes 12 HP if
fought first. By the exact solver, the Slime Lord at this turn makes the boss unwinnable; the door keeps 13 HP.
The third tab shows the other direction: the smaller model reads an unguarded positive order line as "a direct
instruction from the engine". Nine of ten episodes failed identically. The written reasoning takes the observation at
face value; the text is not proof of the internal process, but the repair changed the choice with model and prompt
fixed, and that is why one-sided lines are dangerous.
DEMO: "show the move" draws the chosen target on the map; the state value line shows 13 → lost or 13 → 13.`,
    render: (d) => <ReasoningSlide d={d} />,
  },
  {
    id: "ablations", title: "Ablations: what carries the result", tag: "RQ1 · Table 6.3 · Table 6.4",
    notes: `[1:00] One factor at a time from the final configuration on the simple floor. Lookahead depth is load-bearing:
10 of 10 at depth 3, 4 of 5 at depth 2, nothing at depth 1 or 0.
The observation: without annotations, with the same legal actions and exact costs, both models lose every episode.
That contrast is small, three episodes on an earlier engine version, but the same holds on hand01 and hand02 for
DeepSeek: 0 of 10 bare against 9 of 10 with the annotations.
If the model has to enumerate its own options from the map, half of what it lists is not possible, it misses a
third of the legal options, and a quarter of its choices are illegal. So enumeration itself is a contribution.
Conversation history hurts the smaller model. And temperature: repeating the main cells at 0.6 and 1.0 moved no
success rate of the re-run by more than one episode in five.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-3">
          <RateBars rows={d.depth} groups={QS} caption="Lookahead depth on the simple floor (Table 6.3)." />
          <Tbl size={13.5} rows={[["Factor", "Setting", "Qwen3.5-397B", "Qwen3.6-35B"], ["Observation", "full annotations (final)", "10/10", "7/10"], ["", "bare observation ᶜ", "0/3", "0/3"],
            ["", "map only ᶜ", "0/2", "0/2"], ["Conversation history", "none ᵃ", "9/10", "10/10"], ["", "six previous decisions ᵃ", "10/10", "1/5"]]} />
          <span className="text-[12px] muted">ᶜ earlier code version (N = 3 / 2) · ᵃ on the annotation versions of Table 6.5, rows 6 and 7</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat c={C.blue} v="0/10 → 9/10" k="DeepSeek, hand01 + hand02: bare vs. annotated" size={24} />
            <Stat c={C.red} v="25 %" k="illegal choices when the model lists its own options" size={24} />
          </div>
          <Bul size={15} gap={9}>
            <li><b>Depth 3 is load-bearing</b>: 10/10 → 4/5 → 0/3 → 0/3.</li>
            <li><b>Bare observation</b> (same legal actions, exact costs, no annotations): 0/3 each.</li>
            <li><b>Map only</b>: half of the listed options impossible (66/128), recall 0.68, <b>25 % illegal choices</b>.</li>
            <li><b>History</b>: six previous turns ≈ ¾ of every request; Qwen3.6-35B 1/5 → 10/10 without.</li>
            <li><b>Temperature 0 · 0.6 · 1.0</b>: no cell of the re-run moved by more than one episode in five (R1).</li>
          </Bul>
        </div>
      </div>
    ),
  },
  {
    id: "complex", title: "The boundary: orders that must be derived", tag: "RQ1 · §6.4.5 · Figure 6.2",
    notes: `[1:30] Now the boundary. On the complex floor with the general prompt, no model wins. To find out where each
episode is lost, I applied the exact solver to every state of 55 episodes: the state value is the best final HP
still reachable. All 30 general-prompt episodes are lost at a single fight, 29 at the same Red Slime, at turn 9 or 12.
It is the cheapest fight on offer and becomes free at DEF 20; the optimal route takes it twelfth. The observation
actually said so: "min-cost 0 at max stats, collect stat gems first". The model chose it as "the cheapest meaningful progress".
Importantly, the error a human sees in the trace is a trap door opened later, in 17 of 20 episodes. But by then
the episode was already lost. Only the exact reference finds the decision that mattered.
DEMO: "the losing fight" opens that decision with the observation; "a win with the route" shows the given order being followed.
With the solver's route in the prompt, 11 of 25 win, all capped at 22 HP by the route's door order.
hand03 and hand04: zero of twenty each. Models follow a given order; none derives one.`,
    render: (d) => <ComplexSlide d={d} />,
  },
  {
    id: "gepa-design", title: "Prompt optimisation: study design", tag: "RQ2 · §5.7, §6.5.1",
    notes: `[1:00] For RQ2 I built a reflective loop derived from GEPA. It keeps GEPA's central operator: a teacher model reads
the traces of the episodes and rewrites the prompt. Each candidate plays one episode on three training floors;
it replaces the parent if its fitness is at least as high. A validator rejects any candidate with coordinates,
monster names, routes, allow-lists or numbers of 100 or more, so the optimiser cannot simply memorise a route.
In GEPA terms this is a (1+1) evolutionary algorithm.
The first study uses two weaker models, because Qwen3.5-397B already wins with the hand-written prompt. Each is
crossed with the full and the bare observation and three prompts: rules-only, evolved from rules-only, and the
hand-written one. Evaluation is on thirteen held-out generated floors. Five hypotheses were stated before the runs.
The second study compares single lineage with GEPA's Pareto population at the same budget, with a reasoning model.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 h-full">
        <div className="flex flex-col gap-3">
          <Card t="(1+1) loop, derived from GEPA" c={C.green} size={15}>
            <Bul size={15} gap={6}>
              <li><b>Evaluate</b>: one episode on each of 3 training floors (simple, gen01, gen02), temperature 0; fitness = mean goal score.</li>
              <li><b>Reflect</b>: a teacher model reads prompt + traces (decisions, attributes, overrides, reasoning) and writes a diagnosis and a revised prompt.</li>
              <li><b>Validate</b>: reject coordinates, monster names, routes, allow-lists, numbers ≥ 100.</li>
              <li><b>Select</b>: keep the candidate if its fitness ≥ best so far; 6 evaluations per run.</li>
            </Bul>
          </Card>
          <Card t="Design (pre-registered hypotheses G1–G5)" size={14}>
            <Bul size={14} gap={4}>
              <li>Task models: Llama-3.1-8B, DeepSeek-V4-Flash (no thinking); teacher: Qwen3.5-397B</li>
              <li>{"{full, bare observation} × {rules-only, evolved, hand-written prompt}"}</li>
              <li>Evaluation on <b>13 held-out generated floors</b>; noise floor measured directly</li>
              <li>Second study: (1+1) vs. <b>Pareto</b> loop, 8 candidates each, DeepSeek-V4-Flash with thinking</li>
            </Bul>
          </Card>
        </div>
        <Img src={img("2.3.jpg")} alt="GEPA" caption="GEPA (Agrawal et al., 2025): reflective mutation kept; Pareto selection tested in the second study" />
      </div>
    ),
  },
  {
    id: "gepa-results", title: "Prompt optimisation: within the noise floor", tag: "RQ2 · Table 6.6",
    notes: `[1:00] The first study. Kills out of 13 and mean goal score per prompt. Under the full observation the three
prompts are close. The key is the noise floor: whenever the optimiser kept its seed, the evolved arm is literally
the rules-only prompt played twice. Those pairs differed by up to 0.13 goal score on the held-out floors, and up
to 0.225 on the training floors. The differences between candidates inside a run are of the same size. So with
one episode per floor, the acceptance step cannot see gains of the size the rewrites produce.
Against the hypotheses: G1 partly supported, the one evolved prompt differing from its seed gains 0.025. G2, a
larger gain under the bare observation, is not supported. G3 supported: rules-only with annotations beats evolved
without. G4: the one training gain did not survive re-evaluation. G5: the big models win with rules-only plus
annotations 2 of 3, and 0 of 3 without. Every run, candidate by candidate, is on the prompt-optimisation page.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-3">
          <Tbl size={14} rows={[["Model", "Observation", "Rules-only", "Evolved", "Hand-written"], ["Llama-3.1-8B", "full", "8 / 0.556", "10 / 0.646 ᵃ", "9 / 0.660"],
            ["Llama-3.1-8B", "bare", "5 / 0.462", "4 / 0.399", "6 / 0.484"], ["DeepSeek-V4-Flash (no thinking)", "full", "10 / 0.820", "11 / 0.846", "11 / 0.850"],
            ["DeepSeek-V4-Flash (no thinking)", "bare", "9 / 0.678", "= rules-only ᵇ", "7 / 0.543"]]} />
          <span className="text-[12px] muted">Kills of 13 / mean goal score · ᵃ optimiser returned its seed: byte-identical to rules-only · ᵇ no revision accepted</span>
          <Bul size={14.5} gap={5}>
            <li><b>G1</b> partly supported: the one evolved prompt that differs from its seed gains 0.025 (≤ 0.05).</li>
            <li><b>G2</b> not supported: no larger gain under the bare observation.</li>
            <li><b>G3</b> supported: rules-only + annotations beats evolved without them.</li>
            <li><b>G4</b>: the one training gain did not survive paired re-evaluation.</li>
            <li><b>G5</b> supported: Qwen3.5-397B and Qwen3.6-35B, rules-only: 2/3 full, 0/3 bare.</li>
          </Bul>
        </div>
        <div className="flex flex-col gap-3">
          <Stat c={C.orange} v="≤ 0.13" k="goal-score difference between two runs of the same prompt on the held-out floors (0.225 on training)" />
          <Card t="Noise floor" c={C.orange} size={14.5}>
            <span>When the optimiser keeps its seed, the &quot;evolved&quot; arm is the same prompt played twice: +0.089, +0.051, −0.043, −0.132.</span>
            <span>Candidate differences inside a run: 0.01–0.24. With one episode per floor, acceptance cannot see gains of this size.</span>
          </Card>
          <Link className="btn btn-sm w-fit" href="/prompt-optimisation/">every candidate, diagnosis and verdict</Link>
        </div>
      </div>
    ),
  },
  {
    id: "gepa-confirm", title: "One narrow gain; population search overfits", tag: "RQ2 · Figure 6.3 · Table 6.8",
    notes: `[1:00] There was one gain, and it is selection-affected. Under the bare observation, one rewrite for DeepSeek
without thinking passed a pre-registered paired test on all 13 floors with three repetitions: 30 against 24 wins,
discordant pairs 7 to 1, one-sided p 0.035. But the 13 floors include the four trial floors, chosen because the
rewrite had won them, and their twelve trial episodes; those give 4 to 0. On the nine fresh floors the split is
3 to 1, 18 against 16 wins, p 0.31: inconclusive. So I do not read it as an independent confirmation.
And what the rewrite says is a procedure that restates an annotation: fight only what blocks the path; take the boss when it is winnable.
The second study, with a reasoning model as task model and teacher: both loops raised their training score and
both lost on the held-out floors. The rules-only prompt wins 32 of 39; the (1+1) loop 26, the Pareto loop 24,
significantly worse, p 0.008 two-sided. The Pareto selection degenerated: all eight candidates scored identically
on two of three training floors, so the frontier was the whole population and selection ran on one floor.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 h-full">
        <div className="flex flex-col gap-2 min-h-0">
          <Img src={img("6.3.png")} alt="Paired test per floor" className="flex-1" />
          <Bul size={14.5} gap={5}>
            <li>Bare observation, DeepSeek-V4-Flash (no thinking): <b>30/39 vs. 24/39</b>, discordant 7 : 1, one-sided <b>p = 0.035</b> (pre-registered).</li>
            <li>Includes the 4 trial floors, chosen because the rewrite won them (4 : 0); on the 9 fresh floors 3 : 1, p = 0.31 → <b>selection-affected</b>, not an independent confirmation.</li>
            <li>The rewrite restates an annotation as a procedure.</li>
          </Bul>
        </div>
        <div className="flex flex-col gap-3">
          <Tbl size={14} rows={[["Prompt", "Training", "Held-out kills", "vs. rules-only"], ["Rules-only", "0.597", "32/39", "–"], ["(1+1) loop, best of 8", "0.732", "26/39", "7 : 1, p = 0.07"],
            ["Pareto loop, best of 8", "0.678", "24/39", "8 : 0, p = 0.008"]]} fill={(r, c) => (r === 1 && c === 2 ? "good" : r === 3 && c === 3 ? "bad" : undefined)} />
          <span className="text-[12px] muted">Second study: DeepSeek-V4-Flash with thinking, bare observation, 13 floors × 3; two-sided sign test</span>
          <Bul size={15} gap={8}>
            <li>Both loops <b>raised the training score</b> and <b>lost on the held-out floors</b> → overfitting (G4).</li>
            <li>Pareto selection degenerated: all 8 candidates scored identically on simple and gen01 → the frontier = the whole population; selection ran on gen02 alone.</li>
            <li>The evolved prompts stop with the boss alive where the rules-only prompt fights it.</li>
          </Bul>
        </div>
      </div>
    ),
  },
  {
    id: "gepa-rules", title: "What evolution writes, and what it misses", tag: "RQ2 · Table 6.7 · §6.5.4",
    notes: `[0:45] What do the evolved prompts contain? I counted, over 54 candidates written from the rules-only prompt by a
teacher given no example rules, how often each rule of my hand-written prompts appears. The rules that follow from
the combat formula come back in most candidates: stat items first, no HP for unneeded fights, cheapest progress
first. Two rules almost never appear: the HP limit, a design choice of this thesis, 5 times in 54, and key scarcity,
which the exact solver shows, once.
And the most frequent addition is "trust the engine's annotations".
On the right: without the validator, on the complex floor alone, the optimiser was allowed to write positions and
orders. It never did. It won nothing, and one of its rules forbids exactly the only fight that keeps the boss
winnable. The teacher diagnosed what the agent did, not which earlier decision lost the floor.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-3">
          <Tbl size={13.5} rows={[["Rule of the hand-written prompts", "Origin", "1st study (40)", "2nd study (14)"],
            ["Stat items before the fights they make cheaper ᵃ", "combat formula, solver", "37/40", "14/14"], ["Never pay HP for a fight that unlocks nothing needed", "exact solver", "30/40", "13/14"],
            ["Cheapest progress first (lowest effective cost)", "design of this thesis", "26/40", "10/14"], ["Open doors only when what lies behind is needed", "exact solver", "14/40", "13/14"],
            ["No fight above 40 % of current HP", "design of this thesis", "3/40", "2/14"], ["Keys are scarce", "exact solver", "0/40", "1/14"],
            ["Added by evolution: trust the engine's annotations", "–", "32/40", "5/14"]]} fill={(r, c) => ((r === 5 || r === 6) && c >= 2 ? "bad" : undefined)} />
          <span className="text-[12px] muted">ᵃ partly already in the rules-only prompt: overstates rediscovery. Counted by keyword patterns.</span>
          <Banner c={C.green}>Evolution rediscovers what follows from the combat formula, rarely the HP limit (a design choice, 5/54) or key scarcity (shown by the solver, 1/54)</Banner>
        </div>
        <Card t="Without the validator" size={15}>
          <span className="muted">Complex floor only; positions and orders allowed; 15 evaluations.</span>
          <Bul size={15} gap={8}>
            <li><b>0 wins</b> in training and 0/5 after; no candidate named a position.</li>
            <li>Wrote: &quot;NEVER fight a monster with lookahead=0 or effCost=None&quot;: this forbids the <b>only</b> fight that keeps the boss winnable at turn 9.</li>
            <li>The teacher diagnosed what the agent did, not which earlier decision lost the floor.</li>
          </Bul>
        </Card>
      </div>
    ),
  },
  {
    id: "planning", title: "Planning horizon: commit only when the order is known", tag: "RQ3 · Table 6.9 · Figure 6.4",
    notes: `[1:30] RQ3. Four modes: reactive, one action per call; commit-k, k actions per call; long plans as long as the
model wants, re-planned when a step breaks; and a single call for the whole episode.
On the simple floor, the left panel, the two strongest models win 14 of 20 reactive episodes and 1 of 70
committed-plan episodes, including plans whose length the model chose itself. Even commit-2 loses. On hand01
and hand02, DeepSeek wins 18 of 20 reactively and 0 of 30 with plans. Of 87 broken plans, 50 break at a fight
placed where it cannot yet be won: the plan is written before the engine has computed the facts of the states it
leads to. I call this failure by timing. This is about commitment between observations, not about whether
long-horizon reasoning is harmful.
The right panel is the complex floor with the solver's route in the prompt. Here plans reach parity: commit-5
wins 4 of 5 with 5.8 calls, long plans 5 of 5 with 2.4 calls, against 8 of 10 reactive with about 21 calls.
On the tower with the second tower observation, commit plans reached the same floor, MT8, with 58 to 72 calls
instead of 86.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-6 h-full">
        <div className="flex flex-col gap-3">
          <Card t="Modes" c={C.orange} size={14.5}>
            <Bul size={14.5} gap={4}>
              <li><b>Reactive</b>: one action per call</li>
              <li><b>Commit-k</b>: k = 2, 3, 5 actions per call</li>
              <li><b>Long plan</b>: as many as the model can, re-planned when a step breaks</li>
              <li><b>Single call</b>: one plan for the episode</li>
            </Bul>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat c={C.green} v="14/20" k="reactive, simple floor" size={30} />
            <Stat c={C.red} v="1/70" k="committed plans, simple floor" size={30} />
          </div>
          <Bul size={14.5} gap={6}>
            <li>hand01 + hand02 (DeepSeek): <b>18/20 vs. 0/30</b></li>
            <li><b>50 of 87</b> broken plans break at a fight placed where it cannot yet be won</li>
          </Bul>
        </div>
        <div className="flex flex-col gap-2 min-h-0">
          <Img src={img("6.4.png")} alt="Success and calls by planning mode" className="flex-1" />
          <Bul size={13.5} gap={4}>
            <li><b>Order given</b> (solver route): commit-5 4/5 at 5.8 calls, long plan 5/5 at 2.4 calls vs. reactive 8/10 at 20.8 → parity at 1/4 to 1/9 of the calls.</li>
            <li><b>Tower</b> (second tower observation): commit-2/3/5 reach MT8 like reactive play, with 72, 60 and 58 instead of 86 calls.</li>
          </Bul>
        </div>
      </div>
    ),
  },
  {
    id: "tower", title: "The 24-floor tower: from MT7 to MT18", tag: "Tower · Table 6.13 · §6.7.3",
    notes: `[1:15] The tower is where all of this compounds: hundreds of turns, shops, keys across floors. I report three tower
observations. The heuristic stops at MT8, where the Red Bats need far more attack than anything before them.
The first observation, current floor and returns only, reached MT7; the second, every object on every visited
floor and a tower-wide key budget, MT8. Both ran with the 40 % override and other item values, so they are
engine-assisted, and the comparison is between whole configurations.
The final observation, without the override, with rule 4 at 60 % and plan memory, reached MT18, MT17 and MT16 in
the best runs of three models; eight of the twelve runs still stopped on MT8 or below.
The three runs that passed MT16 defeated the Red Demon King; after him the upgraded MT17 monsters stopped DeepSeek,
and Qwen3.5-397B reached MT18 without a blue key for the hidden staircase.
A run resumed at MT18 with blue keys for sale, as in the original game, reached the normal ending at turn 832.
Caveat: the final observation was developed on the same tower, so no tower result is held out.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-3">
          <FloorBars rows={d.tower} groups={[{ id: "h", label: "heuristic", colour: "#94A3B8" }, { id: "1", label: "first observation", colour: "#64748B" },
            { id: "2", label: "second observation", colour: "#38BDF8" }, { id: "f", label: "final observation", colour: "#F59E0B" }]}
            caption="Highest floor reached (Table 6.13); green line = the normal ending on MT21. Each bar links to its result cell." />
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-sm" href="/game/">play the original tower</Link>
            <Link className="btn btn-sm" href="/episodes/">tower runs, turn by turn</Link>
          </div>
        </div>
        <Bul size={15.5} gap={10}>
          <li><b>Eight of twelve</b> final runs stop on MT8 or below, where the heuristic also stops.</li>
          <li><b>MT16</b>: all three runs that got there defeated the Red Demon King (ATK 1,000).</li>
          <li><b>Stops above MT16</b>: upgraded MT17 monsters; MT18 staircase needs a blue key, none for sale.</li>
          <li><b>Resumed from MT18</b> with blue keys for sale: 1 of 4 continuations reached the normal ending.</li>
          <li><b>Caveat</b>: whole configurations compared; final observation developed on the same tower; no held-out tower.</li>
        </Bul>
      </div>
    ),
  },
  {
    id: "lessons", title: "Methodological lessons: six threats to my own measurements", tag: "Contribution 2 · §7.3",
    notes: `[1:00] The second contribution is methodological. Six things threatened the validity of my own measurements.
One: a machine-generated annotation is a parameter with discontinuous effects; replacing one placeholder by
its number dropped success from 5 of 10 to 0 of 20; the model had read the placeholder as "not recommended yet".
Two: silent overrides and silent configuration, which you have seen. Three: the reference can be wrong, 22 versus 68.
Four: the visible error is not the decisive one, the trap door versus the Red Slime. Five: the engine can be more
generous than the game; two staircases shown too early overstated one run by three floors. Six: models disappear
from the service; the successor of one model lost where its predecessor had won.
Each produced results that were internally consistent and wrong. The platform's job is to make experiments
falsifiable: full logs, recorded configuration, a pinned observation text, logged overrides and an exact reference.`,
    render: () => (
      <div className="flex flex-col gap-4 h-full">
        <div className="grid grid-cols-3 gap-3 flex-1">
          {([["1 · An annotation is a parameter", <>Replacing one placeholder by its number: <b>5/10 → 0/20</b>. The model had read the placeholder as &quot;not recommended yet&quot;.</>, C.red],
            ["2 · Silent overrides and configuration", <>All early wins came from one of two loops both labelled &quot;reactive&quot;; an off-switch also hid annotations.</>, C.red],
            ["3 · The reference can be wrong", <>The published solver: <b>22 HP</b>; the exact optimum: <b>68 HP</b>. Wins at 22 reach a third of the optimum.</>, C.orange],
            ["4 · Visible ≠ decisive", <>Inspection blames the trap door (10,5); exact state values place all 30 losses earlier, at turn 9 or 12.</>, C.orange],
            ["5 · The engine can be more generous", <>Two staircases shown before their scripted event overstated one run: MT21 instead of MT18.</>, C.blue],
            ["6 · Models disappear", <>Three models removed during the study; a successor won <b>0/10</b> where its predecessor had won 2/18.</>, C.blue]] as [string, ReactNode, string][])
            .map(([t, b, c]) => <Card key={t} t={t} c={c} size={15}>{b}</Card>)}
        </div>
        <Banner>The platform makes experiments falsifiable: full logs · recorded configuration · pinned observation text · logged overrides · exact reference</Banner>
      </div>
    ),
  },
  {
    id: "platform", title: "Open framework, and this site", tag: "Contribution 2 · Appendix C",
    notes: `[0:30] Everything is released: the engine, the evaluation harness, the exact solver, all result files and the
run logs. This site is the evidence: every stored episode can be replayed turn by turn with the exact observation and
the model's reasoning, every table of Chapter 6 is listed with its result cells, and the solver, the floors and the
tower game can be tried. Anyone can re-run a thesis experiment with mt-ai-lab and their own API key.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <div className="grid grid-cols-3 gap-3">
          {FEATURES.map(([href, t, s]) => (
            <Link key={href} href={href} className="sl-card hover:border-[var(--gold)]" style={{ textDecoration: "none" }}>
              <span className="t">{t}</span><span className="text-[14px] muted">{s}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <Card t="Magic Tower AI Lab" c={C.blue} size={15}>
            <Bul size={15} gap={5}>
              <li>Engine, harness, exact solver (Java), analysis scripts</li>
              <li>All result files + <b>run logs</b></li>
              <li>Re-run any thesis experiment with your own API key</li>
            </Bul>
          </Card>
          <Banner>github.com/thetobysiu/mt-ai-lab · MIT (code) · CC BY 4.0 (results, logs)</Banner>
        </div>
      </div>
    ),
  },
  {
    id: "answers", title: "Answers to the research questions", tag: "Ch. 7.5",
    notes: `[1:15] To answer the questions.
RQ1: the engine's observation carries most of the effect. With exact two-sided annotations and only mechanical
assists, Qwen3.5-397B wins the simple floor in 15 of 15 episodes, where the heuristic and the bare observation
fail, and repairing one-sided annotations alone moved it from 0 to 10 of 10. The boundary is floors whose decisive
choice is an order of several doors and fights. HA is supported for Qwen3.5-397B on the simple floor and DeepSeek
on hand01 and hand02; not for DeepSeek and Mistral on the simple floor, and undetermined for Qwen3.6-35B.
RQ2: prompt optimisation rediscovers what follows from the combat formula, stays within the noise floor when
the annotations are present, and gives one narrow, selection-affected gain without them. With a reasoning model, both loops
overfit. HB is supported, with the caveat of one episode per floor.
RQ3: reactive control beats every committed mode where facts appear state by state; committed plans match it at a
fraction of the calls only when the order is given. HC is supported where the order must be derived.
The rival explanations, as promised: service noise cannot explain the headline effects, whose intervals do not
overlap; luck explains the training gains of prompt optimisation; and overrides explained the early wins, but
no win of the final configuration contains a strategic override.`,
    render: () => (
      <div className="flex flex-col gap-3 h-full">
        <div className="grid grid-cols-3 gap-3 flex-1">
          {([["RQ1 · Observation", C.blue, "The engine's observation carries most of the effect.", ["Qwen3.5-397B 15/15 on the simple floor; heuristic and bare observation fail.", "Repairing one-sided annotations: 0/5 → 10/10, model and prompt fixed.", "Boundary: multi-step orders (complex, hand03/04)."], "HA supported for Qwen3.5-397B (simple) and DeepSeek (hand01/02); not for DeepSeek and Mistral on simple; undetermined for Qwen3.6-35B."],
            ["RQ2 · Prompt optimisation", C.green, "The observation constrains success more than the prompt.", ["Rediscovers formula-implied rules, rarely the HP limit or key scarcity.", "Within the noise floor with annotations; one narrow, selection-affected gain without (p = 0.035).", "Reasoning model: both loops overfit (Pareto 24/39 vs. 32/39, p = 0.008)."], "HB supported (one episode per floor, two models)."],
            ["RQ3 · Planning horizon", C.orange, "Commit only when the order is already known.", ["Reactive 14/20 vs. committed 1/70 (simple); 18/20 vs. 0/30 (hand01/02).", "Parity at 1/4 to 1/9 of the calls only with the route in the prompt.", "Failure by timing: plans name fights not yet winnable."], "HC supported where the order must be derived."]] as [string, string, string, string[], string][])
            .map(([t, c, head, bs, verdict]) => (
              <Card key={t} t={t} c={c} size={15}>
                <b className="text-[16px]">{head}</b>
                <Bul size={14.5} gap={5}>{bs.map((b) => <li key={b}>{b}</li>)}</Bul>
                <b className="text-[13px] mt-auto" style={{ color: c }}>{verdict}</b>
              </Card>
            ))}
        </div>
        <Banner>Rivals: <b>R1</b> service noise: rejected for the headline effects · <b>R2</b> luck: holds for training gains and is not excluded for the paired gain · <b>R3</b> overrides: true early, excluded for the final configuration</Banner>
      </div>
    ),
  },
  {
    id: "limitations", title: "Limitations", tag: "Ch. 7.4",
    notes: `[0:45] The main limitations. One game, deterministic and fully observable, chosen because it makes attribution
possible; real problems add uncertainty. Small samples, dictated by the cost of reasoning models: at N = 10 the
interval spans about plus or minus 0.25, so differences below about 0.3 are not resolved. The observation was
developed on the simple floor, where the error analysis was also done; the hand floors and held-out floors are checks
beyond it. The hand floors were drafted by a language model and built to defeat the heuristic, so the heuristic's
failure there is by design. The only reference agents are the heuristic and random play; a bounded search over the
same annotations was not run, so I claim an advantage over the implemented heuristic, not that a language model is
needed. One inference service, whose served models changed during the study. Temperature 0 throughout, below the
model-card values, though repeats at 0.6 and 1.0 changed no conclusion. And the final tower observation was developed
on the same tower.`,
    render: () => (
      <div className="grid grid-cols-2 gap-8">
        <Bul size={16.5} gap={14}>
          <li><b>One game</b>: deterministic, fully observable; no extrapolation to uncertainty or partial observability without further study.</li>
          <li><b>Small samples</b>: N = 5–10 per cell: at N = 10 the interval spans about ±0.25, so differences below about 0.3 are not resolved; bare and map-only contrasts use N = 3 and 2.</li>
          <li><b>Development floor = analysis floor</b>: the observation was refined on the simple floor; hand01&apos;s first decision suggests some floor specificity.</li>
          <li><b>Hand floors drafted by an LLM</b>: built to defeat the heuristic: its failure there holds by design.</li>
        </Bul>
        <Bul size={16.5} gap={14}>
          <li><b>Baselines</b>: heuristic and random play only; no bounded search over the same annotations, so an advantage over the heuristic, not evidence that an LLM is needed.</li>
          <li><b>One inference service</b>: served models changed: Qwen3.6-35B 7/10 → 1/5 on the same observation text, with an earlier version of the code.</li>
          <li><b>Temperature 0</b>: below model-card values; repeats at 0.6 and 1.0 changed no conclusion, but not every cell was repeated.</li>
          <li><b>Tower</b>: final observation developed on the same tower; normal ending only from a resumed position; yellow and blue keys withheld from the shops.</li>
        </Bul>
      </div>
    ),
  },
  {
    id: "conclusion", title: "Conclusion and future work", tag: "Ch. 7.6–7.7",
    notes: `[1:00] The take-home message. For agents in long-horizon tasks, strategic knowledge is better placed in the engine's
observation, stated with both sides of every trade-off, than in the prompt. Committed plans pay off only when the
order is already known. And agents need to be evaluated with repeated runs, logged interventions and an exact
reference, otherwise we measure the harness rather than the model.
Regarding the title: "from reactive control to holistic planning" turned out to describe the information a planner
would need, not a capability that planning delivered.
For future work, the natural next step keeps the division of labour and moves the order into the engine: a bounded
search proposes a few candidate orders with exact costs and the model chooses among legible plans; run on its own,
the same search is the comparator this study lacks. A planner that consults the engine at every step would test
whether holistic planning fails for lack of information or ability. And the observation itself can become the object
of optimisation. Thank you.`,
    render: () => (
      <div className="flex flex-col gap-4">
        <div className="sl-banner text-left text-[19px] font-normal" style={{ background: "#1F2A44", color: "#fff", padding: "18px 22px" }}>
          Strategic knowledge belongs in the engine&apos;s observation, with both sides of every trade-off stated, not in the prompt. Committed plans pay off only when the order is already known. Evaluate LLM agents with repeated runs, logged interventions and an exact reference.
        </div>
        <p className="text-center italic text-[17px] m-0 text-[var(--info)]">&quot;From reactive control to holistic planning&quot; describes the information a planner would need, not a capability that planning delivered.</p>
        <Card t="Future work (§7.6)" c={C.orange} size={16}>
          <Bul size={16} gap={8}>
            <li><b>Search for multi-step orders</b>: a bounded search proposes candidate orders with exact HP costs; the model chooses among legible plans. Run alone, it is the missing deterministic comparator.</li>
            <li><b>Planning that consults the engine</b>: propose a step, receive that state&apos;s annotated list, continue.</li>
            <li><b>Prompt optimisation with repeated evaluation</b>: 3–5 episodes per candidate; decision positions as training instances.</li>
            <li><b>The observation as the object of optimisation</b>: a teacher proposes annotations the engine computes exactly, accepted only if held-out success improves.</li>
          </Bul>
        </Card>
      </div>
    ),
  },
  {
    id: "thanks", title: "Thank you", bare: true,
    notes: "[0:15] Thank you. I am happy to take your questions. I have backup slides on the statistics, the solver correction, the tower, the planning checks and the prompt study.",
    render: () => (
      <div className="slide sl-dark justify-center" style={{ padding: "60px 80px" }}>
        <div className="w-[130px] h-[5px] rounded bg-[var(--gold)]" />
        <h1 className="text-[46px] m-0 text-white">Thank you, questions welcome</h1>
        <b className="text-[24px] text-white mt-4">King Wai Siu</b>
        <span className="text-[18px] text-[#D6DEEB]">Code, results, run logs: github.com/thetobysiu/mt-ai-lab · this site: every episode and result</span>
        <span className="text-[15px] text-[#B8C3D6] mt-6">Backup: statistics · rival explanations · temperature · solver correction · hand01 first decision · winning trajectory · tower runs · generated floors · plan check · exact-route prompt · strategy principles</span>
      </div>
    ),
  },
  // ---------------------------------------------------------------- backup
  {
    id: "b-stats", title: "Statistics: Wilson intervals, tests, sample sizes", tag: "Backup · §5.9", backup: "B1",
    notes: `Why Wilson: the normal approximation breaks down at k = 0 or k = N, which are exactly the cells that matter here.
Paired comparisons use the sign test on discordant pairs; one-sided only where pre-registered.
At N = 10 the interval spans about ±0.25, so differences in success rate below about 0.3 are not resolved.
Unit of inference: repeated episodes on fixed floors; repetitions on one floor are not new task instances.`,
    render: () => (
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-3">
          <b className="text-[18px]">Wilson 95 % interval</b>
          <div className="sl-code text-[15px]">{"p̂ = k/N,  z = 1.96\n[ p̂ + z²/2N ± z·√( p̂(1−p̂)/N + z²/4N² ) ] / (1 + z²/N)"}</div>
          <Bul size={16} gap={8}>
            <li>Valid at k = 0 and k = N, where the normal approximation fails.</li>
            <li>Headline: success first, HP/opt among successes second (two-tier).</li>
            <li>Paired comparisons: sign test on discordant pairs; one-sided only where pre-registered (Section 5.9.4).</li>
            <li>Not resolved at these sizes: at N = 10 the interval spans about ±0.25, so differences below about 0.3.</li>
            <li>Repetitions on one floor measure repeatability, not generalisation across floors.</li>
          </Bul>
        </div>
        <Tbl size={15} rows={[["k/N", "Wilson 95 %"], ["0/5", "[0.00, 0.43]"], ["1/5", "[0.04, 0.62]"], ["4/5", "[0.38, 0.96]"], ["5/5", "[0.57, 1.00]"], ["7/10", "[0.40, 0.89]"],
          ["10/10", "[0.72, 1.00]"], ["15/15", "[0.80, 1.00]"], ["0/20", "[0.00, 0.16]"], ["1/70", "[0.00, 0.08]"], ["31/39", "[0.64, 0.89]"]]} />
      </div>
    ),
  },
  {
    id: "b-rivals", title: "Rival explanations (§7.2)", tag: "Backup", backup: "B2",
    notes: `R1: the service is not deterministic at temperature 0; but headline intervals do not overlap, a dominant option gives
identical trajectories, and temperature repeats moved nothing by more than one in five. Cannot be excluded for
differences of one or two episodes in five. A slower source: the served model itself changed between runs
(Qwen3.6-35B 7/10 earlier, 1/5 in the re-run, on the same observation text but an earlier version of the code).
R2: holds for every training gain; for the one gain that passed the pre-registered test it cannot be excluded either:
the 7:1 includes the four trial floors (4:0), and on the 9 fresh floors 3:1, p 0.31, is not separable from luck.
R3: true for early results, excluded for the final configuration.`,
    render: () => (
      <div className="grid grid-cols-3 gap-4">
        {([["R1 · Service non-determinism", "rejected for headline effects", ["Headline intervals do not overlap (10/10 [0.72, 1.00] vs. 0/5 [0.00, 0.43]).", "A dominant option → all 15 episodes on one trajectory.", "Temperature 0.6 / 1.0: no rate moved by more than one in five.", "Not excluded for differences of 1–2 episodes in five; Qwen3.6-35B 7/10 → 1/5 (earlier code version)."], C.blue],
          ["R2 · Luck of single episodes", "holds for training gains", ["Early optimisation runs accepted candidates on one episode each.", "The one full-observation training gain was not confirmed when re-evaluated in pairs.", "The pre-registered gain includes the trial floors (4:0); on the 9 fresh floors 3:1, p = 0.31."], C.green],
          ["R3 · Overrides produce the wins", "true early, excluded now", ["All 21 early wins contained a silent strategic override.", "Final configuration: no strategic override in any win; mechanical overrides logged.", "Runs with the first and second tower observation (40 % override) reported as engine-assisted."], C.orange]] as [string, string, string[], string][])
          .map(([t, v, bs, c]) => <Card key={t} t={t} c={c} size={16}><b style={{ color: c }}>{v}</b><Bul size={15.5} gap={8}>{bs.map((b) => <li key={b}>{b}</li>)}</Bul></Card>)}
      </div>
    ),
  },
  {
    id: "b-temperature", title: "Temperature repetitions (Table 6.3)", tag: "Backup · R1", backup: "B3",
    notes: `All main cells use temperature 0, below the model-card recommendation (0.6 for Qwen3.5-397B, 1.0 for DeepSeek).
In the re-run no success rate at 0.6 or 1.0 differs from 0 by more than one episode in five.`,
    render: () => (
      <div className="flex flex-col gap-5">
        <Tbl size={17} rows={[["Cell (Table 6.2)", "Qwen3.5-397B  T = 0 · 0.6 · 1.0", "DeepSeek-V4-Flash  T = 0 · 0.6 · 1.0"], ["Simple", "5/5 · 5/5 · 5/5", "1/5 · 1/5 · 2/5"],
          ["Complex, single-floor prompt", "0/5 · 0/5 · 0/5", "0/5 · 0/5 · 0/5"], ["Complex, solver-route prompt", "3/5 · 3/5 · 4/5", "4/5 · 4/5 · 3/5 (one death)"]]} />
        <Bul size={17} gap={10}>
          <li>Model cards recommend 0.6 (Qwen3.5-397B) and 1.0 (DeepSeek-V4-Flash) for thinking mode; T = 0 keeps all cells on one condition and makes failures traceable along a single trajectory.</li>
          <li>Re-run: no rate at 0.6 or 1.0 differs from T = 0 by more than one episode in five; order of conditions and the boundary unchanged.</li>
        </Bul>
      </div>
    ),
  },
  {
    id: "b-solver", title: "The solver correction: 22 → 68 HP", tag: "Backup · §4.6", backup: "B4",
    notes: `The published solver groups states by the set of removed obstacles and keeps the first state it reaches for each set.
Every item on the way is taken automatically, so the set fixes ATK, DEF, MDEF and keys; two states with the same set
differ only in HP. The queue orders by decisions first, so a state with more HP that needs one more decision is popped
later and discarded. The corrected test compares HP when a state is popped.
The 45-decision cap never binds: every decision clears one monster or door node, and no reported floor has more than
32 of them, so no route can reach 45 decisions. Replaying the 68-HP route shows it is reachable; optimality comes from
the completeness of the search.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 h-full">
        <Bul size={16} gap={9}>
          <li><b>Graph</b>: regions and obstacles (monsters, doors, items) as nodes; neighbouring nodes that can be taken together without cost are merged.</li>
          <li><b>Search</b>: breadth-first over sets of removed obstacles.</li>
          <li><b>Published</b> (ckcz123): keeps the <b>first</b> state reached per set → complex floor <b>22 HP</b>.</li>
          <li><b>Corrected</b>: the set fixes ATK, DEF, MDEF and keys (items are taken automatically), so it keeps the state with the <b>most HP</b> per set → complex floor <b>68 HP</b> (ATK 16, DEF 20, MDEF 20).</li>
          <li>Complex: {d.complex.states.toLocaleString("en")} states, {d.complex.sets} winning sets; simple: {d.simple.states.toLocaleString("en")} states, {d.simple.sets} winning set, {d.simple.optimum} HP.</li>
          <li>45-decision cap never binds: ≤ 32 monster/door nodes on any reported floor (post-submission check).</li>
        </Bul>
        <SolverSlide d={d} />
      </div>
    ),
  },
  {
    id: "b-hand01", title: "hand01: the first decision", tag: "Backup · §6.7.1 · Figure B.2", backup: "B5",
    notes: `On hand01 the hero starts at the bottom with one yellow key between two yellow doors. Behind the left door (4,8):
+2 ATK, +1 DEF and two keys for 112 HP of fighting; behind the right door (6,8): +1 ATK, +1 DEF, a key and the blue
key for the boss door, for 48 HP. Left first: optimum 14 HP; right first: at most 10 HP. 18 of 20 episodes opened the
right door; all 17 wins among them end at 4 to 9 HP. The observation rates the right door higher on both one-step
measures, and all five Qwen3.5-397B episodes quote the order line of the Black Slime (5,4), which blocks nothing and
names the right door. This suggests part of the annotations' behaviour is floor-specific: a ready test case
for automating observation design.`,
    render: (d) => <Scene p={d.picks.hand01} tab="reasoning" note="Qwen3.5-397B: right door first; left first keeps 14 HP, right first at most 10" />,
  },
  {
    id: "b-trajectory", title: "The winning trajectory on the simple floor (Table 4.4)", tag: "Backup · §4.5.1, §6.4", backup: "B6",
    notes: `Every winning episode of the final configuration, of every model, takes the same seventeen decisions. They are the
optimal route with one change: at turn 15 the Slime Lord (1,9) is fought before the Bat (3,5). The Slime Lord then
costs 75 instead of 52 HP and the Bat 132 instead of 144, so the state value drops from 13 to 2; that is why every win
ends at 2 HP. From turn 15 on, the slack is 2 HP. Two later decisions account for ten of the thirteen failures of the
re-run: at turn 18 only the Bat (3,5) keeps a win; at turn 22 only the door (7,5) keeps a win.
DEMO: the exact optimal route on the map, step by step; the published route ends at the same 13 HP here.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5 h-full min-h-0">
        <RoutePlayer id="simple" text={d.simple.text} solution={d.simple.solution} fill />
        <div className="flex flex-col gap-3">
          <Tbl size={13} rows={[["Turn", "Winning trajectory", "Cost", "Value"], ["2–5", "Black Slime (6,4), Green Slime (5,6), door (4,7), Black Slime (3,7)", "134", "13"],
            ["9–11", "doors (7,0), (8,0), Green Slime (9,0)", "16", "13"], ["15", "Slime Lord (1,9), before the Bat (3,5)", "75", "2"], ["18", "Bat (3,5): only choice that keeps a win", "132", "2"],
            ["22", "door (7,5): only choice that keeps a win", "0", "2"], ["24–32", "Black Slime (9,5), Red Slime (10,7), Slime Lords", "142", "2"], ["35–36", "Bat (5,9), boss", "669", "2"]]}
            fill={(r, c) => (r === 3 && c === 3 ? "bad" : undefined)} />
          <span className="text-[12px] muted">Optimal route (13 HP): Bat (3,5) at action 8 (144 HP), Slime Lord (1,9) at action 11 (52 HP).</span>
        </div>
      </div>
    ),
  },
  {
    id: "b-tower-runs", title: "Tower runs with the final tower observation (Table 6.13, excerpt)", tag: "Backup · §6.7.3", backup: "B7",
    notes: `Final tower observation: the game's item values, no override, rule 4 at 60 %, plan memory, level-ups offered, no
yellow or blue keys for sale. The three runs that reached MT16 defeated the Red Demon King; killing him upgrades the
later monsters, which stopped both DeepSeek runs on MT17. MT18's staircase appears only after the princess, which
needs the Ice Pickaxe behind a blue door; blue keys were not for sale, so the rest of the tower was tested from a
stored position on MT18 with blue keys for sale as in the original game.`,
    render: () => (
      <div className="flex flex-col gap-3">
        <Tbl size={14} center={false} rows={[["Observation", "Agent", "Runs", "Highest floor", "ATK / DEF", "Stopped because"],
          ["final", "Qwen3.5-397B", "3", "MT18, MT8 (2)", "1,257 / 1,996", "MT18: no blue key left; MT8: only lethal fights"], ["final", "DeepSeek-V4-Flash", "3", "MT17 (2), MT8", "1,346 / 1,066", "MT17: upgraded monsters; MT8: Senior Mage"],
          ["final", "Qwen3.6-35B", "3", "MT16, MT8 (2)", "552 / 1,133", "MT16: Red Demon King unwinnable; MT8: Red Bats"], ["final", "Mistral Medium 3.5", "3", "MT8, MT4 (2)", "98 / 100", "MT4: Skeletons lethal"],
          ["resumed (MT18)", "Qwen3.5-397B", "1", "MT21, normal ending", "2,264 / 2,558", "won (turn 832)"], ["resumed (MT18)", "DeepSeek-V4-Flash", "3", "MT21 (2), MT20", "2,294 / 3,633", "turn limit (860)"]]} />
        <span className="text-[13px] muted">Heuristic: MT8 (Red Bats unwinnable). One of four continuations from MT18 reached the normal ending (1/4 [0.05, 0.70]).</span>
      </div>
    ),
  },
  {
    id: "b-generated", title: "Generated floors do not separate the observations", tag: "Backup · §6.7.2", backup: "B8",
    notes: `The 15 generated floors have much more HP slack than the simple and complex floors; 13 end at 150 to 250 HP optimum.
DeepSeek with the final configuration wins 31/39 on the 13 held-out floors, at 0.96 of the optimum, but the same model
also wins 32/39 with the bare observation and the rules-only prompt (that comparison changes the prompt as well).
So these floors do not test the observation; the evidence for the annotations comes from the simple floor and hand01/hand02.`,
    render: () => (
      <Bul size={19} gap={14}>
        <li>Generator: nine 3 × 3 rooms joined by a random spanning tree; kept only if the exact solver wins with an optimum of 1–250 HP. The heuristic wins 8 of 15.</li>
        <li>Much more HP slack: on 13 floors the optimum ends at <b>150–250 HP</b> (simple: 13).</li>
        <li>Qwen3.5-397B, final configuration: gen01 and gen02 3/3 each, at the exact optimum; gen03 1/1 at the optimum.</li>
        <li>DeepSeek-V4-Flash, final configuration, gen03–gen15 × 3: <b>31/39</b> [0.64, 0.89], 0.96 of the optimum; 18/18 on floors the heuristic wins, 13/21 on the others.</li>
        <li>Same floors, same model, <b>bare observation + rules-only prompt: 32/39</b> (prompt changed too).</li>
        <li>So the generated floors do not test the observation; the evidence for the annotations comes from the simple floor and hand01/hand02.</li>
      </Bul>
    ),
  },
  {
    id: "b-plancheck", title: "Plan check: what committed plans actually commit (Table 6.10)", tag: "Backup · RQ3", backup: "B9",
    notes: `Calls fall with k, but new decisions per plan grow slowly: commit-5 commits about three new decisions per plan. With the
whole-floor wording, re-planned long plans are legal throughout in only 6 of 40 cases on the simple floor; they name
monsters not yet reachable and fights not yet winnable. With the max-steps wording plans are shorter and more often
clean, but success stays at 0/5 also in episodes with clean plans. Failure by timing.`,
    render: () => (
      <div className="flex flex-col gap-3">
        <Tbl size={14} rows={[["Floor", "Model", "Mode", "New decisions / plan", "Clean plans"], ["Simple", "Qwen3.5-397B", "commit-2 / 3 / 5", "1.64 / 1.71 / 3.23", "35/44 · 25/35 · 14/22"],
          ["Simple", "Qwen3.5-397B", "long re-planned / single call (WF)", "6.77 / 11.0", "1/13 · 0/5"], ["Simple", "Qwen3.5-397B", "long re-planned / single call (MS)", "4.05 / 5.8", "8/20 · 3/5"],
          ["Simple", "DeepSeek-V4-Flash", "commit-2 / 3 / 5", "1.84 / 1.78 / 2.86", "33/44 · 25/36 · 15/28"], ["Complex route", "DeepSeek-V4-Flash", "commit-2 / 3 / 5", "1.19 / 1.50 / 2.86", "70/77 · 40/48 · 25/29"],
          ["Complex route", "DeepSeek-V4-Flash", "long re-planned (WF / MS)", "8.60 / 7.83", "5/15 · 7/12"], ["Complex route", "DeepSeek-V4-Flash", "single call (WF / MS)", "18.0 / 14.0", "0/5 · 1/4"]]} />
        <Bul size={15.5} gap={6}>
          <li>WF = whole-floor wording, MS = max-steps wording (&quot;as many of the actions you will take after it as you can&quot;).</li>
          <li>Simple floor: success stays 0/5 even in episodes whose plans are clean.</li>
          <li><b>Failure by timing</b>: each step is chosen before the engine has computed the facts of the states it leads to; 50 of 87 broken plans break at a fight placed where it cannot yet be won.</li>
        </Bul>
      </div>
    ),
  },
  {
    id: "b-exact-route", title: "Following the exact optimal route", tag: "Backup · §6.6", backup: "B10",
    notes: `A second compiled-knowledge condition lists the 21 decisions of the exact optimal route with expected HP after each,
played reactively. Qwen3.6-35B wins 2/5, both at 58 HP, the highest HP of any LLM kill on the complex floor. Every
failure leaves the listed route by the model's own choice; three DeepSeek episodes leave it at the same step, taking a
fight shown at 43 HP instead of the listed one shown at 185.
Where the 10 HP go (post-submission trace check): the hero state equals the solver replay through step 17. The solver
takes 0-HP fights automatically, so the two 0-HP Red Slimes (9,3) and (11,0) are not route decisions and are not listed.
This condition runs without the engine's automatic 0-HP fights, and the prompt forbids unlisted fights. Both episodes
fight (9,3) at once but leave (11,0), which guards a +5 MDEF gem, until after steps 19 and 20. Bat (11,4) and Big Bat
(12,12) are fought at MDEF 15 instead of 20, 5 HP more each.
DEMO: this is the turn of the Bat (11,4); the observation tab shows the Red Slime (11,0) offered at 0 HP.`,
    render: (d) => (
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 h-full min-h-0">
        <Scene p={d.picks.exactRoute} tab="observation" note="Qwen3.6-35B, exact-route prompt: the Bat (11,4) while the 0-HP Red Slime (11,0) is offered" />
        <Bul size={15} gap={9}>
          <li><b>Exact-route prompt</b> (Listing A.6): the 21 decisions of the exact optimal route with the expected HP after each; played reactively.</li>
          <li>Qwen3.6-35B: <b>2/5</b>, both at <b>58 HP</b> (0.85 of the optimum); both take all 21 listed decisions in order. DeepSeek-V4-Flash: 1/5, at 40 HP.</li>
          <li>Every failure leaves the route <b>by the model&apos;s own choice</b>; three of five DeepSeek episodes take a fight shown at 43 HP instead of the listed one at 185.</li>
          <li><b>58 vs. 68 HP</b>: the 0-HP Red Slime (11,0) guarding <b>+5 MDEF</b> is not a solver decision, so not listed; without automatic 0-HP fights and with &quot;no unlisted fights&quot;, both wins take it after steps 19–20 → two fights at MDEF 15, <b>+5 HP each</b>.</li>
        </Bul>
      </div>
    ),
  },
  {
    id: "b-principles", title: "Strategy principles and where the agent gets them (Table 4.2)", tag: "Backup · §4.3", backup: "B11",
    notes: `Prompts state general principles, never floor-specific knowledge: no coordinates, no allow-lists, no routes, no
walkthrough numbers. Principles S11 to S14 are tower-specific expert knowledge (Red Bats on MT8, red key for MT16,
Holy Sword and Shield on MT15, Holy Water late) and are never stated; the engine computes the facts that bear on them.`,
    render: () => (
      <Tbl size={14} center={false} rows={[["#", "Principle", "Source", "How the agent meets it"], ["S1", "DEF lowers every strike; monster ATK ≤ hero DEF costs nothing", "combat formula", "rule; [FREE if DEF ≥ x]"],
        ["S2", "ATK just above monster DEF: winnable but expensive", "combat formula", "rule; [WINNABLE at ATK ≥ x]"], ["S3", "Stat item before the fights it makes cheaper", "formula, solver", "rule; net stat-route and fight-order lines"],
        ["S4", "Potion order changes no fight", "combat formula", "potions listed apart from lookahead value"], ["S5", "No HP for a fight that unlocks nothing needed", "exact solver", "rule; lookahead tree"],
        ["S6", "Keys are scarce; the door choice can decide the floor", "exact solver", "rule; key lines, budget"], ["S7", "No fight costing a large share of HP while progress is possible", "this thesis", "rule (40 %; tower 60 %)"],
        ["S8–S10", "Tower: scout first; shop rules; Cross late", "structure, walkthrough", "rules; way-up, shop lines"], ["S11–S14", "Tower expert knowledge (MT8, MT15, MT16, Holy Water)", "walkthrough", "never stated; engine computes the facts"]]} />
    ),
  },
];
