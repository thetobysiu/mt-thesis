// Build-time data for the presentation and the walkthrough: episodes, turns and lines picked from the stored logs, and
// the result cells behind each number, so every demo shows a real decision. Server-only (reads public/data with fs).
import { cellEpisodes, getCell, getFloors, getFloorText, getResults, getSolution, readEpisodeLog } from "./data";
import { findDecision, winLossDivergence } from "./tour-data";
import { GRID_FLOORS, MODEL_NAMES, MODELS, type FloorFacts, type GridCell, type Pick, type PresentData } from "./present-shared";
import type { FloorRow, RateRow, Bar } from "@/components/tour/Bars";

export type { PresentData } from "./present-shared";

function facts(id: string): FloorFacts {
  const f = getFloors().find((x) => x.id === id)!;
  const solution = getSolution(id);
  return { text: getFloorText(id), solution, optimum: f.exact.hp, published: f.published.hp, states: solution.exact.states, sets: solution.exact.winningSets };
}

const firstDecisionTurn = (id: string) => readEpisodeLog(id).turns.find((t) => t.type === "turn" && !t.forced)?.turn ?? 1;

/** First turn of an episode whose executed action matches. */
function turnOf(id: string, re: RegExp): number | null {
  return readEpisodeLog(id).turns.find((t) => t.type === "turn" && !t.forced && re.test(String(t.action ?? "")))?.turn ?? null;
}

function pickRun(cell: string, run: number, turn: number | ((id: string) => number | null)): Pick {
  const id = getCell(cell)?.runs[run]?.episode;
  if (!id) return null;
  const t = typeof turn === "number" ? turn : turn(id);
  return t == null ? null : { id, turn: t };
}

/** The action blocks of an observation keyed by the coordinate in their first line. */
function blocks(observation: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const b of observation.split(/\n(?=\s{0,3}\d+\. \[)/)) {
    const lines = b.split("\n");
    const at = lines[0].match(/at \((\d+,\d+)\)/)?.[1];
    if (at) out.set(at, lines);
  }
  return out;
}

const head = (l: string) => l.replace(/^\s*\d+\. \[[a-z_]+\]\s*/, "").replace(/ — monATK.*?— /, " — ").replace(/\s*\|.*$/, "").replace(/ — net_lookahead.*$/, "").trim();
const keep = (lines: string[]) => [head(lines[0]), ...lines.slice(1).filter((l) => /→ (stat gems|ORDER)/.test(l)).map((l) => l.trim())];

function flip(): PresentData["flip"] {
  const before = findDecision("simple_qwen3.5-397b_basic_mechanical_override", 9, { x: 1, y: 10 });
  const after = findDecision("simple_qwen3.5-397b_basic_order_aware", 9, { x: 1, y: 10 });
  if (!before || !after) return null;
  const obs = (id: string) => String(readEpisodeLog(id).turns.find((t) => t.type === "thinking" && t.turn === 9)?.user_message ?? "");
  const b1 = blocks(obs(before.id)), b2 = blocks(obs(after.id));
  const spec: [string, string, string, boolean][] = [
    ["1,9", "Fight Slime Lord (1,9)", "boss unwinnable after it", false],
    ["7,0", "Open the yellow door (7,0)", "keeps the optimum, 13 HP", true],
    ["7,5", "Open the yellow door (7,5)", "lowers the optimum to 10 HP", false],
  ];
  const actions = spec.filter(([k]) => b1.has(k) && b2.has(k))
    .map(([k, label, outcome, good]) => ({ key: k, label, one: keep(b1.get(k)!), two: keep(b2.get(k)!), outcome, good }));
  const key = (a?: string) => a?.match(/\((\d+,\d+)\)/)?.[1] ?? "";
  return { actions, choseOne: key(before.event.action), choseTwo: key(after.event.action) };
}

function bar(label: string, group?: string): Bar | null {
  const c = getCell(label);
  return c && c.successes != null ? { k: c.successes, n: c.n, href: `/results/${label}/`, group } : null;
}
function pair(text: string, l397: string, l35: string | null): RateRow | null {
  const bars = [bar(l397, "q"), l35 ? bar(l35, "s") : null].filter((b): b is Bar => !!b);
  return bars.length ? { label: text, bars } : null;
}
const rows = (xs: (RateRow | null)[]) => xs.filter((x): x is RateRow => !!x);
function floorRow(label: string, text: string, sub?: string, group?: string): FloorRow | null {
  const c = getCell(label);
  return c && c.floorsMax != null ? { label: text, sub, floor: c.floorsMax, href: `/results/${label}/`, group } : null;
}

export function presentData(): PresentData {
  const grid: Record<string, GridCell> = {};
  for (const f of GRID_FLOORS) for (const m of MODELS) {
    const c = getCell(f.cell(m));
    if (!c || c.successes == null) continue;
    const runs = cellEpisodes(c.label).map((e) => ({ id: e.id, won: e.success === true, turn: firstDecisionTurn(e.id) }));
    grid[c.label] = { label: c.label, k: c.successes, n: c.n, died: c.died ?? 0, ratio: c.hpRatio ?? null, runs };
  }
  const tables = Object.fromEntries(getResults().tables.map((t) => [t.title.split(":")[0], `/results/#${t.id}`]));
  return {
    simple: facts("simple"),
    complex: facts("complex"),
    picks: {
      firstDecision: pickRun("simple_qwen3.5-397b_canon", 0, 2),
      turn9Before: (() => { const d = findDecision("simple_qwen3.5-397b_basic_mechanical_override", 9, { x: 1, y: 10 }); return d ? { id: d.id, turn: 9 } : null; })(),
      turn9After: (() => { const d = findDecision("simple_qwen3.5-397b_basic_order_aware", 9, { x: 1, y: 10 }); return d ? { id: d.id, turn: 9 } : null; })(),
      orderLine35: (() => { const d = findDecision("simple_qwen3.6-35b_final_la3", 4); return d ? { id: d.id, turn: 4 } : null; })(),
      complexLoss: pickRun("complex_qwen3.5-397b_canon", 0, (id) => turnOf(id, /Red Slime at \(11,8\)/)),
      exactRoute: pickRun("complex_qwen3.6-35b_exact68_final2", 2, (id) => turnOf(id, /Bat at \(11,4\)/)),
      hand01: pickRun("hand01_qwen3.5-397b_canon", 0, firstDecisionTurn),
      routeWin: pickRun("complex_route_deepseek-v4-flash_canon", 0, firstDecisionTurn),
    },
    flip: flip(),
    grid,
    repair: rows([
      pair("1 Strategic override (logged)", "simple_qwen3.5-397b_legacy_strategic_control", null),
      pair("2 Mechanical overrides only", "simple_qwen3.5-397b_basic_mechanical_override", null),
      pair("3 + alternative-route tag", "simple_qwen3.5-397b_basic_mech_altroute", null),
      pair("4 + net stat-route and fight-order lines", "simple_qwen3.5-397b_basic_order_aware", "simple_qwen3.6-35b_basic_order_aware"),
      pair("5 + item counts, potion-free cost, guard, budget", "simple_qwen3.5-397b_basic_d1d4", "simple_qwen3.6-35b_basic_d1d4"),
      pair("6 + key budget and key lines", "simple_qwen3.5-397b_basic_k1k2", "simple_qwen3.6-35b_basic_k1k2_16k"),
      pair("7 + no conversation history", "simple_qwen3.5-397b_basic_k1k2_hist0", "simple_qwen3.6-35b_basic_k1k2_16k_hist0"),
      pair("8 + two-sided order line, key line on fights", "simple_qwen3.5-397b_final_la3", "simple_qwen3.6-35b_final_la3"),
      pair("9 + 40 % guard (final configuration)", "simple_qwen3.5-397b_final2_la3", "simple_qwen3.6-35b_final2_la3"),
    ]),
    depth: rows([
      pair("depth 3 (final)", "simple_qwen3.5-397b_final2_la3", "simple_qwen3.6-35b_final2_la3"),
      pair("depth 2", "simple_qwen3.5-397b_final2_la2", "simple_qwen3.6-35b_final2_la2"),
      pair("depth 1", "simple_qwen3.5-397b_final2_la1", "simple_qwen3.6-35b_final2_la1"),
      pair("depth 0", "simple_qwen3.5-397b_final2_la0", "simple_qwen3.6-35b_final2_la0"),
    ]),
    tower: [
      floorRow("tower_MT0-MT23w_heuristic_final7", "Rule-based heuristic", "same engine, fixed rules", "h"),
      floorRow("tower_qwen3.5-397b_final2", "First observation", "Qwen3.5-397B", "1"),
      floorRow("tower_qwen3.5-397b_final3_reactive", "Second observation", "Qwen3.5-397B", "2"),
      ...MODELS.map((m) => floorRow(`tower_${m}_final11_reactive`, "Final observation", `${MODEL_NAMES[m]}, best of 3`, "f")),
      floorRow("tower_qwen3.5-397b_final11_resume_blue", "Resumed on MT18", "Qwen3.5-397B, blue keys for sale", "f"),
    ].filter((x): x is FloorRow => !!x),
    divergence: winLossDivergence("simple_qwen3.6-35b_final2_la3"),
    tables,
  };
}
