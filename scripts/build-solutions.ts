// Precomputes, with the TypeScript solver (tests/solver.test.ts holds it to the Java answers):
//   public/data/floors/<id>.solution.json  optimal route of the exact and of the published search
//   public/data/values/<episode>.json      state value after every turn of a stored single-floor episode
// Episodes on the complex floor and hand03 (slow to solve) are computed only for cells the thesis cites; the
// replay viewer computes the rest in the browser.
//
//   npx tsx scripts/build-solutions.ts [--routes-only | --values-only] [--floor=simple]
// The complex floor and hand03 need minutes and much memory per search: run them one at a time, never in parallel.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import type { EpisodeIndex, FloorEntry, ResultsIndex } from "../lib/data-types";
import { parseFloor, type FloorDef } from "../lib/engine/floor";
import { startDifference } from "../lib/engine/match";
import { GameState } from "../lib/engine/state";
import { Graph, solve, stateText } from "../lib/solver/solver";
import type { RunLog } from "../lib/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public", "data");
const FLOORS = path.join(DATA, "floors");
const VALUES = path.join(DATA, "values");
const SLOW = new Set(["complex", "hand03"]);
const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith("--floor="))?.slice(8);

const { floors: allFloors } = JSON.parse(fs.readFileSync(path.join(FLOORS, "index.json"), "utf8")) as { floors: FloorEntry[] };
const floors = allFloors.filter((f) => !only || f.id === only);
const defs = new Map<string, FloorDef>(floors.map((f) => [f.id, parseFloor(f.id, fs.readFileSync(path.join(FLOORS, `${f.id}.txt`), "utf8"))]));

function route(text: string, mode: "exact" | "published") {
  const r = solve(new Graph(text), mode);
  return {
    hp: r.hp, solvable: r.solvable, states: r.states, winningSets: r.winningSets,
    route: (r.best?.route ?? []).map((s) => ({ kind: s.kind, tiles: s.tiles, hp: s.hero.hp, atk: s.hero.atk, def: s.hero.def,
                                                keys: [s.hero.yellow, s.hero.blue, s.hero.red] })),
  };
}

if (!args.has("--values-only")) {
  for (const f of floors) {
    const t0 = Date.now();
    const text = defs.get(f.id)!.text;
    const out = { id: f.id, exact: route(text, "exact"), published: route(text, "published") };
    fs.writeFileSync(path.join(FLOORS, `${f.id}.solution.json`), JSON.stringify(out));
    console.log(`${f.id.padEnd(8)} exact ${out.exact.hp} (${out.exact.route.length} steps) · published ${out.published.hp} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
}

if (!args.has("--routes-only")) {
  const cited = new Set((JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf8")) as ResultsIndex).cells
    .filter((c) => c.thesis).flatMap((c) => c.runs.map((r) => r.episode)).filter(Boolean) as string[]);
  const episodes = (JSON.parse(fs.readFileSync(path.join(DATA, "episodes.json"), "utf8")) as EpisodeIndex).episodes
    .filter((e) => defs.has(e.floor) && (!SLOW.has(e.floor) || cited.has(e.id)));
  fs.mkdirSync(VALUES, { recursive: true });
  const memo = new Map<string, number | null>();
  const value = (s: GameState): number | null => {
    if (s.goalReached) return s.hero.hp;
    if (s.failed || s.hero.hp <= 0) return null;
    const text = stateText(s.floor.text, s.floor.height, s.hero, s.removed);
    if (!memo.has(text)) {
      const r = solve(new Graph(text), "exact");
      memo.set(text, r.solvable ? r.hp : null);
    }
    return memo.get(text)!;
  };
  let done = 0, skipped = 0;
  const t0 = Date.now();
  for (const e of episodes) {
    const target = path.join(VALUES, `${e.id}.json`);
    if (fs.existsSync(target) && !args.has("--force")) { done++; continue; }
    const floor = defs.get(e.floor)!;
    const log = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA, "episodes", `${e.id}.json.gz`))).toString("utf8")) as RunLog;
    const start = log.turns.find((t) => t.type === "start");
    if (!start || startDifference(start, floor)) { skipped++; continue; }
    const s = new GameState(floor);
    const values: { turn: number; value: number | null }[] = [{ turn: 0, value: value(s) }];
    let ok = true;
    for (const ev of log.turns) {
      if (ev.type !== "turn") continue;
      const a = s.actions().find((x) => x.label === ev.action);
      if (!a) { ok = false; break; }
      s.apply(a);
      values.push({ turn: ev.turn ?? values.length, value: value(s) });
    }
    if (!ok) { skipped++; continue; }
    fs.writeFileSync(target, JSON.stringify({ id: e.id, floor: e.floor, optimum: values[0].value, values }));
    if (++done % 100 === 0) console.log(`  ${done} episodes · ${memo.size} distinct states · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  console.log(`state values: ${done} episodes, ${skipped} skipped (earlier floor versions), ${memo.size} states solved, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
