// Build-time comparison of the exact optimal route with the most common winning trajectory of a floor.
import type { EpisodeEntry, FloorSolution } from "./data-types";
import { readEpisodeLog, readEpisodeValues } from "./data";
import { parseFloor } from "./engine/floor";

const DOORS: Record<number, string> = { 81: "yellow door", 82: "blue door", 83: "red door" };

export type RouteDecision = { label: string; hp: number };
export type EpisodeDecision = {
  turn: number; label: string; hp: number | null; value: number | null; assisted: boolean;
  status: "route" | "departure" | "after";
};
export type RouteComparison = {
  episode: EpisodeEntry; groupSize: number; largest: number; wins: number; optimalWins: number; optimum: number;
  route: RouteDecision[]; steps: EpisodeDecision[];
  departure: { turn: number; label: string; expected: string | null; before: number | null; after: number | null; exact: boolean } | null;
};

type Cleared = { turn: number; label: string; hp: number | null; assisted: boolean; tiles: string[] };

/** Turns of a stored episode that clear a monster or a door, with the tiles they clear (from the cumulative `removed`). */
function clearedDecisions(id: string, isDecision: (k: string) => boolean): Cleared[] {
  const out: Cleared[] = [];
  let prev = new Set<string>();
  for (const t of readEpisodeLog(id).turns) {
    if (t.type !== "turn" || !t.removed) continue;
    const now = t.removed.map((p) => `${p[0]},${p[1]}`);
    const fresh = now.filter((k) => !prev.has(k) && isDecision(k));
    prev = new Set(now);
    if (fresh.length) {
      out.push({ turn: t.turn ?? 0, label: String(t.action ?? "").replace(/\s+dmg=-?\d+$/, ""), hp: t.hero?.hp ?? null, assisted: !!t.forced, tiles: fresh });
    }
  }
  return out;
}

export function compareWithRoute(floorId: string, text: string, solution: FloorSolution, wins: EpisodeEntry[]): RouteComparison | null {
  const sol = solution.exact;
  if (!wins.length || !sol.solvable || sol.hp == null) return null;
  const floor = parseFloor(floorId, text);
  const tileAt = (k: string) => { const [x, y] = k.split(",").map(Number); return floor.grid[y]?.[x] ?? 0; };
  const isDecision = (k: string) => { const t = tileAt(k); return !!floor.monsters[t] || t in DOORS; };
  const nameOf = (k: string) => { const t = tileAt(k); return `${floor.monsters[t]?.name ?? DOORS[t] ?? `tile ${t}`} (${k})`; };

  const groups = new Map<string, { eps: EpisodeEntry[]; steps: Cleared[] }>();
  for (const e of wins) {
    const steps = clearedDecisions(e.id, isDecision);
    const key = steps.flatMap((s) => s.tiles).join(" ");
    const g = groups.get(key) ?? { eps: [], steps };
    g.eps.push(e);
    groups.set(key, g);
  }
  const top = [...groups.values()]
    .map((g) => ({ ...g, valued: g.eps.find((e) => readEpisodeValues(e.id)) }))
    .sort((a, b) => Number(!!b.valued) - Number(!!a.valued) || b.eps.length - a.eps.length)[0];
  const largest = Math.max(...[...groups.values()].map((g) => g.eps.length));
  const rep = top.valued ?? top.eps[0];
  const steps = rep === top.eps[0] ? top.steps : clearedDecisions(rep.id, isDecision);
  const values = readEpisodeValues(rep.id);
  const valueAt = new Map((values?.values ?? []).map((v) => [v.turn, v.value]));

  const routeSteps = sol.route.filter((s) => s.kind === "decision").map((s) => s.tiles.map((t) => `${t.x},${t.y}`));
  const route = sol.route.filter((s) => s.kind === "decision").map((s, i) => ({ label: routeSteps[i].map(nameOf).join(", "), hp: s.hp }));

  // First step off the route: by exact state value where it was computed, else by position.
  let mismatch = -1; let expected: string | null = null;
  {
    let r = 0; let left = new Set(routeSteps[0] ?? []);
    outer: for (let i = 0; i < steps.length; i++) {
      for (const k of steps[i].tiles) {
        if (!left.has(k)) { mismatch = i; expected = [...left].map(nameOf).join(", ") || null; break outer; }
        left.delete(k);
        if (left.size === 0) left = new Set(routeSteps[++r] ?? []);
      }
    }
  }
  let dep = mismatch;
  let exact = false;
  if (values) {
    exact = true;
    const turn = values.values.find((v) => v.value != null && v.value < sol.hp!)?.turn;
    dep = turn == null ? -1 : steps.findLastIndex((s) => s.turn <= turn);
    if (dep !== mismatch) expected = null;
  }
  const before = dep >= 0 ? valueAt.get(steps[dep].turn - 1) ?? sol.hp : sol.hp;
  return {
    episode: rep, groupSize: top.eps.length, largest, wins: wins.length, optimum: sol.hp,
    optimalWins: wins.filter((e) => (e.finalHp ?? -Infinity) >= sol.hp!).length,
    route,
    steps: steps.map((s, i) => ({
      turn: s.turn, label: s.label, hp: s.hp, assisted: s.assisted, value: valueAt.get(s.turn) ?? null,
      status: dep < 0 || i < dep ? "route" : i === dep ? "departure" : "after",
    })),
    departure: dep < 0 ? null : {
      turn: steps[dep].turn, label: steps[dep].label, expected, exact,
      before: exact ? before : null, after: exact ? valueAt.get(steps[dep].turn) ?? null : null,
    },
  };
}
