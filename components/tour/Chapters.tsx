// The eleven tour chapters. Server components: every number that comes from a result file is read from the data at
// build time; the remaining numbers are quoted from the thesis section named in each chapter.
import Link from "next/link";
import { DamageCalc } from "./DamageCalc";
import { DecisionQuiz } from "./DecisionQuiz";
import { DecisionText } from "./DecisionText";
import { FloorBars, RateBars, type Bar, type FloorRow, type RateRow } from "./Bars";
import { RoutePlayer } from "@/components/RoutePlayer";
import { SolverExplorer } from "@/components/SolverExplorer";
import { getCell, getFloors, getFloorText, getResults, getSolution } from "@/lib/data";
import { wilson } from "@/lib/format";
import { cellOverrides, findDecision, replayHref, winLossDivergence } from "@/lib/tour-data";

const MODELS = ["qwen3.5-397b", "deepseek-v4-flash", "qwen3.6-35b", "mistral-medium-3.5"];
const MODEL_NAMES: Record<string, string> = { "qwen3.5-397b": "Qwen3.5-397B", "deepseek-v4-flash": "DeepSeek-V4-Flash", "qwen3.6-35b": "Qwen3.6-35B", "mistral-medium-3.5": "Mistral Medium 3.5" };
const Q = "#F59E0B", S = "#38BDF8";

function bar(label: string, group?: string): Bar | null {
  const c = getCell(label);
  if (!c || c.successes == null) return null;
  return { k: c.successes, n: c.n, href: `/results/${label}/`, group };
}
function rate(label: string, text: string, sub?: string): RateRow | null {
  const b = bar(label);
  return b ? { label: text, sub, href: b.href, bars: [b] } : null;
}
/** One row, one bar per model: Qwen3.5-397B and (optionally) Qwen3.6-35B. */
function pair(text: string, l397: string, l35: string | null): RateRow | null {
  const bars = [bar(l397, "q"), l35 ? bar(l35, "s") : null].filter((b): b is Bar => !!b);
  return bars.length ? { label: text, bars } : null;
}
const rows = (xs: (RateRow | null)[]) => xs.filter((x): x is RateRow => !!x);
function floorRow(label: string, text: string, sub?: string, group?: string, note?: string): FloorRow | null {
  const c = getCell(label);
  if (!c || c.floorsMax == null) return null;
  return { label: text, sub, floor: c.floorsMax, href: `/results/${label}/`, group, note };
}
function tableHref(prefix: string) {
  const t = getResults().tables.find((x) => x.title.startsWith(prefix));
  return t ? `/results/#${t.id}` : "/results/";
}
function canonRun(cell: string, run = 0) { return getCell(cell)?.runs[run]?.episode ?? null; }

function Say({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 text-[15px] leading-relaxed max-w-[78ch]">{children}</div>;
}

/** Table 6.2 (re-run, N = 5 per cell) as a grid: floors × models. */
function MainGrid() {
  const floors: { id: string; title: string; cell: (m: string) => string }[] = [
    { id: "simple", title: "Simple", cell: (m) => `simple_${m}_canon` },
    { id: "complex", title: "Complex", cell: (m) => `complex_${m}_canon` },
    { id: "complex-route", title: "Complex, route in prompt", cell: (m) => `complex_route_${m}_canon` },
    { id: "hand01", title: "hand01", cell: (m) => `hand01_${m}_canon` },
    { id: "hand02", title: "hand02", cell: (m) => `hand02_${m}_canon` },
    { id: "hand03", title: "hand03", cell: (m) => `hand03_${m}_canon` },
    { id: "hand04", title: "hand04", cell: (m) => `hand04_${m}_canon` },
  ];
  const opt = Object.fromEntries(getFloors().map((f) => [f.id, f.exact.hp]));
  return (
    <div className="scroll-x">
      <table className="tbl text-[13px]">
        <thead>
          <tr><th>Agent</th>{floors.map((f) => <th key={f.id}>{f.title}</th>)}</tr>
          <tr className="muted"><td>exact optimum</td>{floors.map((f) => <td key={f.id} className="mono">{opt[f.id.replace("-route", "")] ?? "–"} HP</td>)}</tr>
        </thead>
        <tbody>
          <tr><td>Rule-based heuristic</td>{floors.map((f) => <td key={f.id} className="mono muted">{f.id === "complex-route" ? "—" : "0/1"}</td>)}</tr>
          {MODELS.map((m) => (
            <tr key={m}>
              <td>{MODEL_NAMES[m]}</td>
              {floors.map((f) => {
                const c = getCell(f.cell(m));
                if (!c || c.successes == null) return <td key={f.id} className="muted">—</td>;
                const p = c.successes / c.n;
                return (
                  <td key={f.id} style={{ background: `color-mix(in srgb, var(--ok) ${Math.round(p * 45)}%, transparent)` }}>
                    <Link className="mono" href={`/results/${c.label}/`}>{c.successes}/{c.n}</Link>
                    {c.died ? <span className="text-[var(--bad)] text-[11px]"> †{c.died}</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted text-[12px] mt-1">Wins k/N per cell of the re-run of Table 6.2; † = episodes in which the hero died. The heuristic row is quoted from Table 6.2.</p>
    </div>
  );
}

export function TourContent({ slug }: { slug: string }) {
  switch (slug) {
    case "game": {
      return (
        <>
          <Say>
            <p>
              Magic Tower is a grid game. The hero has hit points (HP), attack (ATK) and defence (DEF), and every floor holds monsters,
              doors, keys, gems and potions. A monster blocks its tile until it is defeated; a door until a key of its colour is spent on it.
              Everything that is defeated, opened or collected is gone for good, and nothing in the game is random.
            </p>
            <p>
              A fight is resolved in strikes, and the hero strikes first. The hero needs
              <span className="mono"> T = ⌈monster HP / (ATK − monster DEF)⌉ </span>
              strikes, so the monster strikes <span className="mono">T − 1</span> times, each for
              <span className="mono"> max(0, monster ATK − DEF)</span>. The product is the HP the fight costs. If the hero&apos;s ATK does not exceed the
              monster&apos;s DEF, the fight cannot be won at all.
            </p>
            <p>
              Try it on the monsters of the simple floor, the running example of the thesis. The hero starts there with 470 HP, ATK 9 and
              DEF 4; four yellow doors, five keys, four red and four blue gems and six potions lie on the floor, and the boss waits at the bottom.
            </p>
          </Say>
          <DamageCalc text={getFloorText("simple")} />
          <Say>
            <p>
              Two consequences drive the game. Each point of ATK can remove a monster strike, and each point of DEF lowers every strike.
              So the order matters: a gem collected before a fight saves HP on that fight and every later one. Deciding the order of fights,
              doors and items is the whole problem.
            </p>
          </Say>
        </>
      );
    }
    case "one-decision": {
      const ep = canonRun("simple_qwen3.5-397b_canon");
      return (
        <>
          <Say>
            <p>
              Because nothing can be undone, a decision early on can make the end of the floor impossible, and nothing on the screen says so.
              The first decision of the simple floor shows how sharp this is.
            </p>
          </Say>
          <DecisionQuiz text={getFloorText("simple")} replayHref={ep ? replayHref(ep, 2) : null} />
          <Say>
            <p className="muted text-[14px]">
              The value shown after each action is the best final HP still reachable from the state it leads to, computed by the exact solver in
              your browser. The same measure, the <i>state value</i>, is used throughout the thesis to find the turn at which an episode was lost.
            </p>
          </Say>
        </>
      );
    }
    case "optimal-route": {
      return (
        <>
          <Say>
            <p>
              The hero starts with 470 HP, and the potions add 700. In the best order, the monsters that have to be fought, the boss included,
              cost 1,157 HP. The optimal route therefore ends with 13 HP: a single decision that wastes 13 HP or more loses the floor.
            </p>
            <p>
              The exact solver finds exactly one set of monsters and doors that wins. Its route has seventeen actions; at every one of them at
              least one legal alternative makes the boss unwinnable, at ten of them every alternative does, and on average 87 % of the
              alternatives lose (Table 4.4). Step through it below.
            </p>
          </Say>
          <RoutePlayer id="simple" text={getFloorText("simple")} solution={getSolution("simple")} />
          <Say>
            <p>
              Every winning episode of the final configuration follows the same sequence, the <i>winning trajectory</i>. It equals the optimal
              route except at turn 15, where it fights the Slime Lord (1,9) before the Bat (3,5). That costs 11 HP, so every win ends at 2 HP
              instead of 13, and from then on any decision that wastes 2 HP loses.
            </p>
          </Say>
        </>
      );
    }
    case "observation": {
      const ep = canonRun("simple_qwen3.5-397b_canon");
      const annotations: [string, string][] = [
        ["Damage and HP after", "exact HP cost of every fight and the HP that remains"],
        ["Status tags", "SAFE, MODERATE, RISKY, LETHAL, WINNABLE at ATK ≥ x, FREE if DEF ≥ x, DEAD END, alternative route"],
        ["Cost at maximum stats", "what the fight would cost after every remaining gem"],
        ["Lookahead tree", "what the action unlocks, up to three gateways deep"],
        ["Lookahead value, effective cost", "value of what is unlocked, net of the gateway fights"],
        ["Net stat-route line", "cost of reaching the gems behind an action and what they save"],
        ["Fight-order line", "HP wasted by taking a fight now instead of after a stat route"],
        ["Key lines and key budget", "keys used and gained, doors exposed; keys versus closed doors"],
        ["Boss line and HP budget", "whether the boss is winnable now and the HP the way to it needs"],
      ];
      return (
        <>
          <Say>
            <p>
              The agent is a hybrid. A deterministic engine reads the floor, lists every legal action with its exact cost, and annotates each
              action with what it unlocks and what it costs to use. The language model reads this list, reasons, and answers with the number
              of one action. The engine executes it. The model never computes a path or a fight, and it cannot name an action that does not exist.
            </p>
            <p>
              Below is the real input at the first decision, as Qwen3.5-397B received it in a winning episode, with its reasoning and answer.
              The highlighted action is the one it chose.
            </p>
          </Say>
          <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_22rem]">
            {ep ? <DecisionText id={ep} turn={2} /> : <p className="muted">Episode not found.</p>}
            <div className="panel p-3 flex flex-col gap-2 text-[13px]">
              <b>The annotations (Table 5.1)</b>
              <dl className="flex flex-col gap-2 m-0">
                {annotations.map(([k, v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd className="m-0 muted">{v}</dd></div>)}
              </dl>
            </div>
          </div>
          <Say>
            <p>
              The engine also assists: it collects items and keys and takes fights that cost 0 HP without asking. A <i>mechanical override</i>
              replaces only choices that cannot be executed usefully: a door that leads nowhere, an unwinnable or a lethal fight. Every override is logged.
            </p>
          </Say>
        </>
      );
    }
    case "solver": {
      const f = getFloors();
      const simple = f.find((x) => x.id === "simple")!;
      const complex = f.find((x) => x.id === "complex");
      return (
        <>
          <Say>
            <p>
              To know how good an episode is, each floor needs its optimum. The solver turns the grid into a graph: every monster and door is a
              node, neighbouring items are merged, and chains with nothing attached are merged too. It then searches over the sets of nodes the
              hero has cleared, keeping for each set the state with the most HP.
            </p>
            <p>
              The solver published with the test maps keeps the <i>first</i> state it reaches for each set instead of the best. On the simple floor
              both give {simple.exact.hp} HP. On the complex floor the published search reports {complex?.published.hp ?? 22} HP and the exact
              search {complex?.exact.hp ?? 68}, so every early claim of an &quot;optimal&quot; complex-floor win was an artefact (Appendix E, incident 12).
            </p>
          </Say>
          <SolverExplorer floors={[{ id: "simple", title: "Simple floor", text: getFloorText("simple"), optimum: simple.exact.hp, published: simple.published.hp }]} />
          <Say>
            <p className="text-[14px]">
              More floors, including all generated floors, are on the <Link className="link" href="/solver/">solver page</Link>. The searches of the
              complex floor and hand03 take minutes, so their routes are precomputed on their <Link className="link" href="/floors/">floor pages</Link>.
            </p>
          </Say>
        </>
      );
    }
    case "results": {
      return (
        <>
          <Say>
            <p>
              With the annotations, Qwen3.5-397B wins every one of its 15 episodes on the simple floor: ten earlier and five in the re-run on the
              final code, each at 2 HP [0.80, 1.00]. The rule-based heuristic, acting on the same engine output by fixed rules, ends the floor
              alive at 443 HP with the boss untouched. Without the annotations, the model loses too (0/3 per model, Table 6.3).
            </p>
          </Say>
          <MainGrid />
          <Say>
            <p>
              Every model wins hand01 and hand02 in most episodes. No model wins the complex floor with the single-floor prompt, nor hand03
              or hand04: their decisive choice is a long order of doors and fights. With the published solver&apos;s route written into the prompt,
              three of four models win the complex floor.
            </p>
            <p className="text-[14px] muted">
              Hypothesis HA is supported for Qwen3.5-397B on the simple floor and for DeepSeek-V4-Flash on hand01 and hand02. Every cell links to its
              result file, its settings and its episodes.
            </p>
          </Say>
        </>
      );
    }
    case "overrides": {
      const ov = cellOverrides("simple_qwen3.5-397b_legacy_strategic_control").filter((o) => o.reason == null || !/lethal|unwinnable|dead/i.test(o.reason));
      return (
        <>
          <Say>
            <p>
              The early wins on the simple floor looked like the model&apos;s own. Then every stored log was checked turn by turn, comparing the
              model&apos;s answer with the action the engine executed.
            </p>
            <p>
              In 94 turns of 68 stored episodes, the engine had executed a different action from the one the model chose, without logging it.
              A rule borrowed from the heuristic replaced the model&apos;s choice whenever it judged another action much cheaper. Every one of the 21
              stored wins contained such a replacement; in 17 of them it came at turn 9, where the model chose the Slime Lord (1,9) and the engine
              opened the door (7,0) instead (Section 6.4.1).
            </p>
          </Say>
          <div className="panel p-3 flex flex-col gap-2 text-[14px]">
            <b>The configuration reproduced deliberately, overrides logged (Table 6.5, row 1): every strategic override</b>
            {ov.length ? (
              <ul className="m-0 pl-5 flex flex-col gap-1">
                {ov.map((o) => (
                  <li key={`${o.id}-${o.turn}`}>
                    <Link className="link" href={replayHref(o.id, o.turn)}>turn {o.turn}</Link>: the model chose <b>{o.chose}</b>, the engine executed <b>{o.executed}</b>
                    {" "}<span className={`tag ${o.won ? "tag-ok" : "tag-bad"}`}>{o.won ? "episode won" : "episode lost"}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No override found.</p>}
          </div>
          <RateBars rows={rows([
            rate("simple_qwen3.5-397b_legacy_strategic_control", "Strategic override on (logged)", "earlier hand-written prompt"),
            rate("simple_qwen3.5-397b_basic_mechanical_override", "Mechanical overrides only", "single-floor prompt"),
            rate("simple_qwen3.5-397b_basic_mech_altroute", "+ alternative-route tag"),
          ])} caption="Qwen3.5-397B on the simple floor; bars = k/N, whiskers = Wilson 95 % interval. Rows 1–3 of Table 6.5." />
          <Say>
            <p>
              Without the strategic override, the model lost every episode. Overrides were reduced to the mechanical cases and logged at every
              turn; in the fifteen winning episodes of Qwen3.5-397B in the final configuration, no override of any kind occurred. The lesson for evaluating such
              agents: log every intervention of the engine, or the wins may not be the model&apos;s.
            </p>
          </Say>
        </>
      );
    }
    case "repairs": {
      const before = findDecision("simple_qwen3.5-397b_basic_mechanical_override", 9, { x: 1, y: 10 });
      const after = findDecision("simple_qwen3.5-397b_basic_order_aware", 9, { x: 1, y: 10 });
      return (
        <>
          <Say>
            <p>
              Reading the reasoning of the lost episodes showed a pattern. At each decisive turn, the model cited an annotation that stated one side
              of a trade-off and left out the other, followed it correctly, and was wrong. The thesis calls this a <i>one-sided annotation</i> and
              found five kinds:
            </p>
            <ol className="pl-5 m-0 flex flex-col gap-1">
              <li><b>a saving without the cost of reaching it</b>: gems behind a door &quot;save 155 HP&quot;, but reaching them costs 198;</li>
              <li><b>a value without its cost</b>: a potion counted as the value of the fight in front of it, although it can be collected in any order;</li>
              <li><b>an efficiency without affordability</b>: &quot;take this fight before …&quot; for a fight that costs 46.5 % of the HP;</li>
              <li><b>a deficit without scope</b>: a budget that summed optional monsters and declared a winnable floor unwinnable;</li>
              <li><b>a count without multiplicity</b>: two gems behind one door listed once.</li>
            </ol>
            <p>
              Each was repaired in the engine by stating the missing side, never in the prompt. At turn 9, the same model in the same state reasoned
              like this before and after the net stat-route and fight-order lines were added:
            </p>
          </Say>
          <div className="grid gap-[var(--gap)] lg:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="tag tag-bad w-fit">before (row 2): chose the Slime Lord (1,9), the boss became unwinnable</span>
              {before ? <DecisionText id={before.id} turn={9} initialTab="reasoning" height={420} /> : <p className="muted">Episode not found.</p>}
            </div>
            <div className="flex flex-col gap-1">
              <span className="tag tag-ok w-fit">after (row 4): opened the door (7,0), state value stays 13</span>
              {after ? <DecisionText id={after.id} turn={9} initialTab="reasoning" height={420} /> : <p className="muted">Episode not found.</p>}
            </div>
          </div>
          <RateBars groups={[{ id: "q", label: "Qwen3.5-397B", colour: Q }, { id: "s", label: "Qwen3.6-35B", colour: S }]} rows={rows([
            pair("1 Strategic override (logged)", "simple_qwen3.5-397b_legacy_strategic_control", null),
            pair("2 Mechanical overrides only", "simple_qwen3.5-397b_basic_mechanical_override", null),
            pair("3 + alternative-route tag", "simple_qwen3.5-397b_basic_mech_altroute", null),
            pair("4 + net stat-route and fight-order lines", "simple_qwen3.5-397b_basic_order_aware", "simple_qwen3.6-35b_basic_order_aware"),
            pair("5 + item counts, potion-free cost, guard, budget", "simple_qwen3.5-397b_basic_d1d4", "simple_qwen3.6-35b_basic_d1d4"),
            pair("6 + key budget and key lines", "simple_qwen3.5-397b_basic_k1k2", "simple_qwen3.6-35b_basic_k1k2_16k"),
            pair("7 + no conversation history", "simple_qwen3.5-397b_basic_k1k2_hist0", "simple_qwen3.6-35b_basic_k1k2_16k_hist0"),
            pair("8 + two-sided order line, key line on fights", "simple_qwen3.5-397b_final_la3", "simple_qwen3.6-35b_final_la3"),
            pair("9 + 40 % guard (final configuration)", "simple_qwen3.5-397b_final2_la3", "simple_qwen3.6-35b_final2_la3"),
          ])} caption={<>The cumulative repair sequence of Table 6.5 on the simple floor; each row adds its change to the row above. <Link className="link" href={tableHref("Table 6.5")}>All cells</Link>.</>} />
          <Say>
            <p>
              Row 4 is the largest step: with model, prompt, temperature and lookahead fixed, two annotation lines took Qwen3.5-397B from 0/5 to
              10/10. Rows 5 and 8 show that a repair can itself introduce a one-sided line, which the next row then fixed.
            </p>
          </Say>
        </>
      );
    }
    case "decisive-turns": {
      const d397 = winLossDivergence("simple_qwen3.5-397b_basic_k1k2_hist0");
      const d35 = winLossDivergence("simple_qwen3.6-35b_final2_la3");
      const fmt = (v: number | null | undefined) => v === undefined ? "–" : v == null ? "lost" : `${v} HP`;
      const card = (d: ReturnType<typeof winLossDivergence>, who: string) => d && (
        <div className="panel p-3 flex flex-col gap-2 text-[14px]">
          <b>{who}: a win and a loss of the same cell</b>
          <span>Identical for {d.turn - 1} turns. At <b>turn {d.turn}</b> the win takes <b>{d.actionA}</b>, the loss <b>{d.actionB}</b>.</span>
          <span className="muted text-[13px]">State value before: {fmt(d.before)}; after: win {fmt(d.afterA)}, loss {fmt(d.afterB)}.</span>
          <Link className="btn btn-sm w-fit" href={`/compare/?a=${d.a}&b=${d.b}`}>compare the two episodes</Link>
        </div>
      );
      return (
        <>
          <Say>
            <p>
              Comparing each failed episode with the winning trajectory action by action locates the first departure, and the state value after it
              shows whether that departure lost the floor. In the re-run of Table 6.2, ten of the thirteen failures depart at one of two turns.
            </p>
            <p>
              At <b>turn 18</b>, with 720 HP, ATK 10 and DEF 6, only the Bat (3,5) at 132 HP keeps the boss winnable; the Slime Lord (4,2) costs
              60 HP now against 22 later. At <b>turn 22</b>, the door (7,5) keeps the value at 2 HP; the Slime Lord (4,2) costs 52 now against 22
              later, and the boss can no longer be defeated.
            </p>
          </Say>
          <div className="grid gap-[var(--gap)] lg:grid-cols-2">
            {card(d397, "Qwen3.5-397B without conversation history")}
            {card(d35, "Qwen3.6-35B, final configuration")}
          </div>
          <Say>
            <p>
              How far ahead does the engine have to look for the model? The lookahead tree shows what an action unlocks up to three gateways deep.
              Cutting it shows that the depth is load-bearing on this floor:
            </p>
          </Say>
          <RateBars groups={[{ id: "q", label: "Qwen3.5-397B", colour: Q }, { id: "s", label: "Qwen3.6-35B", colour: S }]} rows={rows([
            pair("depth 3 (final)", "simple_qwen3.5-397b_final2_la3", "simple_qwen3.6-35b_final2_la3"),
            pair("depth 2", "simple_qwen3.5-397b_final2_la2", "simple_qwen3.6-35b_final2_la2"),
            pair("depth 1", "simple_qwen3.5-397b_final2_la1", "simple_qwen3.6-35b_final2_la1"),
            pair("depth 0", "simple_qwen3.5-397b_final2_la0", "simple_qwen3.6-35b_final2_la0"),
          ])} caption="Lookahead depth on the simple floor (Table 6.3). At depth 1, all eight episodes open the yellow door (7,5) early; at depth 0, five of eight fight the Slime Lord (1,9) before the stat item that makes it cheaper." />
          <Say>
            <p className="text-[14px] muted">
              The depth is floor-specific: on hand01 and hand02, DeepSeek-V4-Flash wins 9 of 10 episodes at depth 1, as at depth 3.
            </p>
          </Say>
        </>
      );
    }
    case "prompt-optimisation": {
      return (
        <>
          <Say>
            <p>
              A hosted model can only be changed through its input. The thesis&apos;s loop, derived from GEPA, plays the current prompt on three
              training floors, lets a teacher model read the traces and write a diagnosis and a revised prompt, and keeps the revision if it scores
              at least as well. A fixed validator rejects any candidate that contains coordinates, monster names, routes, lists of allowed fights
              or numbers of 100 or more. The question (RQ2) was whether evolved prompts beat a hand-written prompt or one that states only the
              rules, and how that depends on the observation.
            </p>
            <p>
              The study stated its hypotheses in advance and measured the noise floor directly: the variation between two evaluations of the same
              prompt, paired on thirteen held-out generated floors.
            </p>
          </Say>
          <div className="kpis">
            <div className="kpi"><span className="v">within noise</span><span className="k">evolved prompts against the hand-written and rules-only prompts when the annotations are present</span><Link className="link" href={tableHref("Table 6.6")}>Table 6.6</Link></div>
            <div className="kpi"><span className="v">one gain</span><span className="k">confirmed without annotations; it restates an annotation as a procedure</span></div>
            <div className="kpi"><span className="v">26 · 24 / 32</span><span className="k">held-out wins of 39: (1+1) loop and Pareto loop against the rules-only prompt, with a reasoning model</span></div>
          </div>
          <Say>
            <p>
              Evolution rediscovers the rules that follow from the combat formula and the floor structure, but rarely the limit on HP spent per
              fight or the scarcity of keys (Table 6.7). With the annotations present, its gains stay within the
              variation between repeated evaluations; across the experiments, the observation constrained success more than the prompt did.
            </p>
            <p className="text-[14px] muted">The prompt-optimisation pages, with each iteration&apos;s prompt, the teacher&apos;s diagnosis and the validator&apos;s verdict, follow in a later step.</p>
          </Say>
        </>
      );
    }
    case "planning-and-tower": {
      const [lo, hi] = wilson(1, 70);
      return (
        <>
          <Say>
            <p>
              The title asks about a move from reactive control to holistic planning. The agent can decide one action per call, or commit to
              k actions, to a plan for the whole floor, or to a single plan made once. Committed plans need fewer model calls.
            </p>
          </Say>
          <div className="kpis">
            <div className="kpi"><span className="v">14 / 20</span><span className="k">reactive wins on the simple floor, Qwen3.5-397B and DeepSeek-V4-Flash</span></div>
            <div className="kpi"><span className="v">1 / 70</span><span className="k">committed-plan wins, same models and floor, including plans of self-chosen length [{lo.toFixed(2)}, {hi.toFixed(2)}]</span><Link className="link" href={tableHref("Tables 6.9")}>Tables 6.9–6.10</Link></div>
            <div className="kpi"><span className="v">¼ – ⅑</span><span className="k">of the calls for the same success, only where the solver&apos;s route is in the prompt</span></div>
          </div>
          <Say>
            <p>
              A plan step is chosen before the engine has computed the facts of the state it leads to. Where the order must be derived from those
              facts, committed plans fail; where the order is given, they transcribe it a few steps ahead at lower cost.
            </p>
            <p>
              The tower is the long version of the problem: 24 floors, shops, keys carried between floors, and the normal ending on MT21. The
              highest floor reached rose across three tower observations; the heuristic stops on MT8.
            </p>
          </Say>
          <FloorBars groups={[{ id: "h", label: "heuristic", colour: "#94A3B8" }, { id: "1", label: "first observation", colour: "#64748B" }, { id: "2", label: "second", colour: S }, { id: "3", label: "final", colour: Q }]} rows={[
            floorRow("tower_MT0-MT23w_heuristic_final7", "Rule-based heuristic", undefined, "h"),
            floorRow("tower_qwen3.5-397b_final2", "Qwen3.5-397B", "first", "1"),
            floorRow("tower_qwen3.5-397b_final3_reactive", "Qwen3.5-397B", "second", "2"),
            floorRow("tower_qwen3.5-397b_final11_reactive", "Qwen3.5-397B", "final, best of 3", "3"),
            floorRow("tower_deepseek-v4-flash_final11_reactive", "DeepSeek-V4-Flash", "final, best of 3", "3"),
            floorRow("tower_qwen3.6-35b_final11_reactive", "Qwen3.6-35B", "final, best of 3", "3"),
            floorRow("tower_mistral-medium-3.5_final11_reactive", "Mistral Medium 3.5", "final, best of 3", "3"),
            floorRow("tower_qwen3.5-397b_final11_resume_blue", "Qwen3.5-397B, resumed on MT18", "blue keys for sale", "3", "normal ending"),
          ].filter((x): x is FloorRow => !!x)} caption={<>Highest floor reached (Table 6.13); the green mark is MT21, the normal ending. <Link className="link" href={tableHref("Table 6.13")}>All tower runs</Link>.</>} />
          <Say>
            <p>
              <b>What it adds up to.</b> The agent&apos;s decisions were rarely better than what the engine stated at the moment of decision. When the
              engine stated both sides of every trade-off, Qwen3.5-397B won the simple floor in 15 of 15 episodes and the prompt mattered little.
              When it did not, neither a better prompt nor a longer plan recovered the loss.
            </p>
            <p className="text-[14px]">
              Continue with the <Link className="link" href="/results/">results</Link>, the <Link className="link" href="/episodes/">episodes</Link> or the{" "}
              <Link className="link" href="/compare/">comparison of a win and a loss</Link>, or <Link className="link" href="/play/simple/">play the simple floor</Link> yourself.
            </p>
          </Say>
        </>
      );
    }
    default:
      return null;
  }
}
