// Fold a stored run log into a replayable state: maps per floor, per-turn snapshots, decision cards, result.
// Adapted from mt-ai-lab's dashboard (lib/run.ts); live-only events dropped, observation kept per decision.
import type { Hero, MapData, RunEvent } from "./types";

export type Snapshot = {
  idx: number; turn: number; floorId: string | null; hero: Hero | null; removed: Set<string>;
  action: string; target: { x: number; y: number } | null; path: number[][] | null;
};

export type TurnCard = {
  key: string;
  kind: "start" | "turn" | "thinking" | "parse_error" | "stuck" | "stopped" | "floor_change" | "plan" | "error" | "loop_guard" | "info";
  turn?: number; snapIdx?: number; event: RunEvent;
  observation?: string;   // the user message the model saw at this decision
  thinking?: string; response?: string; planNote?: string;
};

export type RunState = {
  maps: Record<string, MapData>;
  currentFloor: string | null;
  snapshots: Snapshot[];
  cards: TurnCard[];
  hero: Hero | null;
  initialHp: number;
  result: RunEvent | null;
  turnCount: number;
  decisions: number;
  assisted: number;
  replayed: number;          // resumed run: the stored run's own turns up to the resume point
  overrides: number;
  parseErrors: number;
  meta: { mode?: string; taskModel?: string; floorId?: string; initialEnemies?: number; systemPrompt?: string | null };
  floorsVisited: string[];
  isTower: boolean;
  floorRange: string[];
};

export function emptyRun(): RunState {
  return {
    maps: {}, currentFloor: null, snapshots: [], cards: [], hero: null, initialHp: 1000, result: null,
    turnCount: 0, decisions: 0, assisted: 0, replayed: 0, overrides: 0, parseErrors: 0, meta: {}, floorsVisited: [], isTower: false, floorRange: [],
  };
}

function removedSet(ev: RunEvent, prev: Set<string>): Set<string> {
  // The evaluator logs the cumulative set, solver replays only this turn's tile; the union is right for both.
  if (!Array.isArray(ev.removed)) return prev;
  const next = new Set(prev);
  for (const r of ev.removed) next.add(`${r[0]},${r[1]}`);
  return next;
}

function findLast<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

/** A turn of a resumed run that repeats the stored run's own decision. */
export function isReplayed(ev: RunEvent): boolean {
  return !!ev.forced && typeof ev.forced_reason === "string" && ev.forced_reason.startsWith("resumed from");
}

export function applyEvent(n: RunState, ev: RunEvent): RunState {
  const key = `${ev.type}-${ev.turn ?? "x"}-${n.cards.length}`;
  switch (ev.type) {
    case "start": {
      const fid = ev.floor_id ?? ev.map?.floor_id ?? "floor";
      if (ev.map) n.maps[fid] = ev.map;
      n.currentFloor = fid;
      const hero = ev.hero ?? ev.map?.hero ?? null;
      n.hero = hero;
      n.initialHp = hero?.hp ?? 1000;
      n.snapshots = [{ idx: 0, turn: 0, floorId: fid, hero, removed: new Set(), action: "Start", target: null, path: null }];
      n.meta = { mode: ev.mode, taskModel: ev.task_model, floorId: fid, initialEnemies: ev.initial_enemies,
                 systemPrompt: ev.runtime_system_prompt ?? null };
      n.floorsVisited = [fid];
      n.floorRange = Array.isArray(ev.floor_range) ? ev.floor_range : [];
      n.isTower = !!ev.multi_floor || n.floorRange.length > 1;
      n.cards.push({ key, kind: "start", event: ev });
      return n;
    }
    case "thinking":
      n.cards.push({ key, kind: "thinking", turn: ev.turn, event: ev, observation: ev.user_message, thinking: "" });
      return n;
    case "thinking_result": {
      const i = findLast(n.cards, (c) => c.kind === "thinking" && c.turn === ev.turn);
      const patch = { thinking: ev.thinking ?? n.cards[i]?.thinking ?? "", response: ev.response_preview };
      if (i >= 0) n.cards[i] = { ...n.cards[i], ...patch };
      else n.cards.push({ key, kind: "thinking", turn: ev.turn, event: ev, ...patch });
      return n;
    }
    case "plan_note": {
      const i = findLast(n.cards, (c) => (c.kind === "thinking" || c.kind === "turn") && c.turn === ev.turn);
      if (i >= 0 && typeof ev.note === "string") n.cards[i] = { ...n.cards[i], planNote: ev.note };
      return n;
    }
    case "plan":
      n.cards.push({ key, kind: "plan", turn: 0, event: ev, response: ev.response });
      return n;
    case "turn": {
      const prev = n.snapshots[n.snapshots.length - 1];
      const fid = ev.floor_id ?? n.currentFloor;
      const hero = ev.hero ?? prev?.hero ?? null;
      const d = ev.action_detail;
      const lastHere = findLast(n.snapshots, (x) => x.floorId === fid);  // never union another floor's cleared tiles
      const snap: Snapshot = {
        idx: n.snapshots.length, turn: ev.turn ?? n.snapshots.length, floorId: fid, hero,
        removed: removedSet(ev, lastHere >= 0 ? n.snapshots[lastHere].removed : new Set()), action: ev.action ?? "",
        target: d ? { x: d.x, y: d.y } : null, path: ev.action_path ?? null,
      };
      n.snapshots.push(snap);
      n.hero = hero;
      n.turnCount += 1;
      if (isReplayed(ev)) n.replayed += 1; else if (ev.forced) n.assisted += 1; else n.decisions += 1;
      if (ev.corrected_from != null) n.overrides += 1;
      // the turn takes over its decision card (observation, reasoning and answer stay attached)
      const ti = findLast(n.cards, (c) => c.kind === "thinking" && c.turn === ev.turn);
      const from = ti >= 0 ? n.cards[ti] : undefined;
      const card: TurnCard = { key, kind: "turn", turn: ev.turn, snapIdx: snap.idx, event: ev, observation: from?.observation,
                               thinking: from?.thinking, response: ev.llm_response ?? from?.response, planNote: from?.planNote };
      if (ti >= 0) n.cards.splice(ti, 1, card); else n.cards.push(card);
      return n;
    }
    case "floor_change": {
      const fid = ev.floor_id ?? "floor";
      // keep a floor's first map: a re-entry map has the cleared tiles baked in; snapshots carry the history
      if (ev.map && !n.maps[fid]) n.maps[fid] = ev.map;
      n.currentFloor = fid;
      n.isTower = true;
      if (!n.floorsVisited.includes(fid)) n.floorsVisited.push(fid);
      const prev = n.snapshots[n.snapshots.length - 1];
      const hero = ev.hero ?? prev?.hero ?? null;
      n.hero = hero;
      const lastHere = findLast(n.snapshots, (x) => x.floorId === fid);
      const snap: Snapshot = { idx: n.snapshots.length, turn: ev.turn ?? prev?.turn ?? 0, floorId: fid, hero,
                               removed: lastHere >= 0 ? n.snapshots[lastHere].removed : new Set(), action: `→ ${fid}`, target: null, path: null };
      n.snapshots.push(snap);
      n.cards.push({ key, kind: "floor_change", turn: ev.turn, snapIdx: snap.idx, event: ev });
      return n;
    }
    case "parse_error":
      n.parseErrors += 1;
      n.cards.push({ key, kind: "parse_error", turn: ev.turn, event: ev });
      return n;
    case "loop_guard":
    case "stuck":
    case "stopped":
    case "error":
      n.cards.push({ key, kind: ev.type, turn: ev.turn, event: ev });
      return n;
    case "override":
      return n;  // the following turn event carries corrected_from
    case "result":
    case "bfs_result":
      n.result = ev;
      return n;
    default:
      return n;
  }
}

/** Replay a whole stored log. */
export function replay(events: RunEvent[], result?: RunEvent | null): RunState {
  const s = events.reduce(applyEvent, emptyRun());
  if (!s.result && result) s.result = result;
  return s;
}

/** First snapshot index at which two runs act differently (null: identical; the shorter length if one stops early). */
export function firstDifference(a: RunState, b: RunState): number | null {
  const n = Math.min(a.snapshots.length, b.snapshots.length);
  for (let i = 1; i < n; i++) if (a.snapshots[i].action !== b.snapshots[i].action || a.snapshots[i].floorId !== b.snapshots[i].floorId) return i;
  return a.snapshots.length === b.snapshots.length ? null : n;
}
