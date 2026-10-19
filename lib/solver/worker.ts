/// <reference lib="webworker" />
// Runs the exact solver off the main thread: state values for play hints and replays, optimal routes.
import { Graph, solve } from "./solver";

export type SolverRequest =
  | { id: number; type: "value"; texts: string[] }
  | { id: number; type: "route"; text: string; mode: "exact" | "published" };
export type SolverResponse =
  | { id: number; type: "value"; values: (number | null)[] }
  | { id: number; type: "route"; hp: number | null; solvable: boolean; states: number; route: { kind: string; tiles: { x: number; y: number }[]; hp: number; atk: number; def: number }[] }
  | { id: number; type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<SolverRequest>) => {
  const req = e.data;
  try {
    if (req.type === "value") {
      const values = req.texts.map((t) => {
        const r = solve(new Graph(t), "exact");
        return r.solvable ? r.hp : null;
      });
      ctx.postMessage({ id: req.id, type: "value", values } satisfies SolverResponse);
    } else {
      const r = solve(new Graph(req.text), req.mode);
      const route = (r.best?.route ?? []).map((s) => ({ kind: s.kind, tiles: s.tiles, hp: s.hero.hp, atk: s.hero.atk, def: s.hero.def }));
      ctx.postMessage({ id: req.id, type: "route", hp: r.hp, solvable: r.solvable, states: r.states, route } satisfies SolverResponse);
    }
  } catch (err) {
    ctx.postMessage({ id: req.id, type: "error", message: String(err) } satisfies SolverResponse);
  }
};
