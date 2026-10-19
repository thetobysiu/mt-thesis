"use client";
// Promise wrapper around the solver worker; one worker per page, requests answered in order.
import type { SolverRequest, SolverResponse } from "./worker";

type Pending = { resolve: (r: SolverResponse) => void; reject: (e: Error) => void };
type Request = SolverRequest extends infer R ? R extends unknown ? Omit<R, "id"> : never : never;
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function get(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent<SolverResponse>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.type === "error") p.reject(new Error(e.data.message)); else p.resolve(e.data);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || "solver worker failed"));
    pending.clear();
    worker = null;
  };
  return worker;
}

function ask<T extends SolverResponse>(req: Request): Promise<T> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (r: SolverResponse) => void, reject });
    get().postMessage({ ...req, id });
  });
}

/** Exact state values (best final HP still reachable; null = the boss can no longer be defeated). */
export async function stateValues(texts: string[]): Promise<(number | null)[]> {
  const r = await ask<Extract<SolverResponse, { type: "value" }>>({ type: "value", texts });
  return r.values;
}

export function solveRoute(text: string, mode: "exact" | "published") {
  return ask<Extract<SolverResponse, { type: "route" }>>({ type: "route", text, mode });
}

/** Stop all running searches (the worker is restarted on the next request). */
export function cancelSolver(): void {
  worker?.terminate();
  worker = null;
  for (const p of pending.values()) p.reject(new Error("cancelled"));
  pending.clear();
}
