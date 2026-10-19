"use client";
// Steps through the solver's search on one floor: the merged-node graph, the state taken from the queue, the
// frontier, dominance pruning, and the difference between the exact and the published search.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Stat, Widget } from "./Widget";
import { parseFloor, type FloorDef } from "@/lib/engine/floor";
import { itemTable } from "@/lib/engine/state";
import { Graph, Search, type SearchEvent, type SNode, type SolverState } from "@/lib/solver/solver";

const CELL = 40;
const DOOR_FILL: Record<number, string> = { 81: "#EAB308", 82: "#3B82F6", 83: "#EF4444" };
type FloorInfo = { id: string; title: string; text: string; optimum: number; published: number | null };
type Snapshot = { index: number; polls: number; queue: number; skip: number; push: number; best: SolverState | null; current: SolverState | null; done: boolean; log: string[] };

function nodeNamer(def: FloorDef) {
  const items = itemTable(def);
  return (n: SNode) => {
    const p = n.parts[0] ?? n;
    const t = def.grid[p.x]?.[p.y];
    const base = def.monsters[t]?.name ?? items[t]?.name ?? ({ 81: "yellow door", 82: "blue door", 83: "red door" } as Record<number, string>)[t] ?? "start";
    return `${base} (${p.y},${p.x})${n.parts.length > 1 ? ` +${n.parts.length - 1}` : ""}`;
  };
}

/** The search plus counters, advanced from event handlers only; the component renders its snapshots. */
class Runner {
  readonly search: Search;
  private skip = 0;
  private push = 0;
  private current: SolverState | null = null;
  private log: string[] = [];
  constructor(text: string, readonly mode: "exact" | "published", private name: (n: SNode) => string) {
    this.search = new Search(new Graph(text), mode);
  }

  private describe(e: SearchEvent): string | null {
    const s = e.state;
    switch (e.kind) {
      case "pop": return `take a state: ${s.cnt} decisions, HP ${s.score}`;
      case "skip": this.skip++; return this.mode === "exact" ? `skip: this set of cleared nodes was already expanded with at least ${s.score} HP` : "skip: this set was already taken once (the published search keeps the first)";
      case "prune": return null;
      case "push": this.push++; return e.node ? `  queue → ${this.name(e.node)}: HP ${s.score}` : null;
      case "stop": return s.bossDead ? `boss defeated with ${s.score} HP` : "stop: 45 decisions without the boss";
    }
  }

  advance(n: number): Snapshot {
    const lines: string[] = [];
    for (let i = 0; i < n && !this.search.done; i++) {
      this.search.poll((e) => {
        if (e.kind === "pop") this.current = e.state;
        const t = this.describe(e);
        if (t && n <= 10) lines.push(t);
      });
    }
    if (lines.length) this.log = [...lines.reverse(), ...this.log].slice(0, 40);
    return this.snapshot();
  }

  snapshot(): Snapshot {
    const s = this.search;
    return { index: s.index, polls: s.polls, queue: s.queue.size, skip: this.skip, push: this.push, best: s.best, current: this.current, done: s.done, log: this.log };
  }
}

export function SolverExplorer({ floors }: { floors: FloorInfo[] }) {
  const [floorId, setFloorId] = useState(floors[0].id);
  const [mode, setMode] = useState<"exact" | "published">("exact");
  const floor = floors.find((f) => f.id === floorId)!;
  return (
    <div className="flex flex-col gap-[var(--gap)]">
      <div className="toolbar flex flex-wrap items-center gap-2">
        <select className="input" value={floorId} onChange={(e) => setFloorId(e.target.value)} aria-label="floor">
          {floors.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <div className="tabs" role="tablist" aria-label="search">
          <button role="tab" aria-selected={mode === "exact"} className="btn btn-sm" onClick={() => setMode("exact")}>exact search</button>
          <button role="tab" aria-selected={mode === "published"} className="btn btn-sm" onClick={() => setMode("published")}>published search</button>
        </div>
      </div>
      <SolverRun key={`${floorId}-${mode}`} floor={floor} mode={mode} />
    </div>
  );
}

function SolverRun({ floor, mode }: { floor: FloorInfo; mode: "exact" | "published" }) {
  const def = useMemo(() => parseFloor(floor.id, floor.text), [floor]);
  const name = useMemo(() => nodeNamer(def), [def]);
  const [runner, setRunner] = useState(() => new Runner(floor.text, mode, name));
  const [snap, setSnap] = useState<Snapshot>(() => runner.snapshot());
  const [running, setRunning] = useState(false);
  const g = runner.search.graph;

  const reset = () => {
    const r = new Runner(floor.text, mode, name);
    setRunner(r);
    setSnap(r.snapshot());
    setRunning(false);
  };
  const advance = (n: number) => {
    const s = runner.advance(n);
    setSnap(s);
    if (s.done) setRunning(false);
  };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      const s = runner.advance(150);
      setSnap(s);
      if (s.done) setRunning(false); else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, runner]);

  const best = snap.best;
  const current = snap.done && best ? best : snap.current;
  const frontier = useMemo(() => new Set(current ? [...current.current.linked].filter((n) => !current.visited[n.id]).map((n) => n.id) : []), [current]);
  const anchor = (n: SNode) => { const p = n.parts[0] ?? n; return { cx: (p.y + 0.5) * CELL, cy: (p.x + 0.5) * CELL }; };
  const fill = (n: SNode) => n.type === 0 ? "var(--gold)" : n.type === 299 ? "#A855F7" : n.item ? "#22C55E" : n.doors.length ? DOOR_FILL[n.type] ?? "#EAB308" : "#F87171";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-sm" onClick={() => advance(1)} disabled={snap.done}>step</button>
        <button className="btn btn-sm" onClick={() => advance(10)} disabled={snap.done}>+10</button>
        <button className="btn btn-sm" onClick={() => advance(100)} disabled={snap.done}>+100</button>
        <button className="btn btn-sm btn-primary" onClick={() => setRunning((v) => !v)} disabled={snap.done}>{running ? "pause" : "run to the end"}</button>
        <button className="btn btn-sm" onClick={reset}>reset</button>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_420px]">
        <Widget title="Search graph" bodyClass="scroll-x">
          <div className="board inline-block">
          <svg width={g.cols * CELL} height={g.rows * CELL} viewBox={`0 0 ${g.cols * CELL} ${g.rows * CELL}`} className="block" role="img" aria-label="merged node graph of the floor">
            {g.map[0].map((row, r) => row.map((t, c) => (
              <rect key={`${r},${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={t === 1 ? "#1E293B" : "#0B1220"} stroke="#111827" />
            )))}
            {g.list.map((n) => [...n.linked].filter((m) => m.id > n.id).map((m) => {
              const a = anchor(n), b = anchor(m);
              const on = current && current.visited[n.id] && current.visited[m.id];
              return <line key={`${n.id}-${m.id}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={on ? "#FBBF24" : "#475569"} strokeOpacity={on ? 0.8 : 0.45} strokeWidth={on ? 2 : 1} />;
            }))}
            {g.list.map((n) => n.parts.slice(1).map((p, i) => {
              const a = anchor(n);
              return <line key={`p${n.id}-${i}`} x1={a.cx} y1={a.cy} x2={(p.y + 0.5) * CELL} y2={(p.x + 0.5) * CELL} stroke={fill(n)} strokeDasharray="3 3" strokeOpacity={0.7} />;
            }))}
            {g.list.map((n) => {
              const a = anchor(n);
              const visited = current?.visited[n.id] ?? n.id === 0;
              return (
                <g key={n.id}>
                  {n.parts.slice(1).map((p, i) => <circle key={i} cx={(p.y + 0.5) * CELL} cy={(p.x + 0.5) * CELL} r={4} fill={fill(n)} opacity={visited ? 0.9 : 0.4} />)}
                  <circle cx={a.cx} cy={a.cy} r={CELL * 0.3} fill={fill(n)} opacity={visited ? 1 : 0.35}
                          stroke={frontier.has(n.id) ? "#FBBF24" : visited ? "#F8FAFC" : "none"} strokeWidth={frontier.has(n.id) ? 3 : 1}>
                    <title>{`node ${n.id}: ${name(n)}${visited ? " (cleared in this state)" : frontier.has(n.id) ? " (next to the cleared region)" : ""}`}</title>
                  </circle>
                  <text x={a.cx} y={a.cy + 3.5} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="#0B1220" pointerEvents="none">{n.id}</text>
                </g>
              );
            })}
          </svg>
          </div>
          <p className="muted text-[13px] mt-2">
            One circle per node: monsters red (boss purple), doors in their colour, items green, the start gold. Items next to each other
            are merged into one node (dashed lines), as are chains of monsters and doors with nothing else attached. Lines join nodes the hero
            can walk between. Bright: cleared in the state just taken from the queue (once the search ends, in the best state); gold ring:
            the nodes it can take next.
          </p>
        </Widget>

        <div className="flex flex-col gap-[var(--gap)] min-w-0">
          <div className="grid grid-cols-2 gap-[var(--gap)]">
            <Stat label="Expanded" value={snap.index.toLocaleString("en")} sub={`${snap.polls} taken from the queue`} />
            <Stat label="Queue" value={snap.queue} sub={`${snap.push} queued in total`} />
            <Stat label="Skipped" value={snap.skip} sub={mode === "exact" ? "set already expanded with ≥ HP" : "set already taken"} />
            <Stat label="Best so far" value={best ? `${best.score} HP` : "–"} tone={best?.bossDead ? "ok" : undefined}
                  sub={snap.done ? `finished · optimum ${floor.optimum}` : `optimum ${floor.optimum}`} />
          </div>
          {current && (
            <div className="panel p-3 text-[13px]">
              <b>{snap.done && best ? "Best state found:" : "State just taken:"}</b> {current.cnt} decisions · HP {current.score} · ATK {current.current.hero!.atk} / DEF {current.current.hero!.def} ·
              keys {current.current.hero!.yellow}/{current.current.hero!.blue}/{current.current.hero!.red}
              {snap.done && best && (
                <ol className="mt-2 grid gap-x-4 sm:grid-cols-2 list-decimal pl-5 font-mono text-[12px]">
                  {best.route.filter((r) => r.kind === "decision").map((r, i) => {
                    const n = g.list.find((m) => m.id === r.nodeId);
                    return <li key={i}>{n ? name(n) : `node ${r.nodeId}`} <span className="muted">→ {r.hero.hp} HP</span></li>;
                  })}
                </ol>
              )}
            </div>
          )}
          <Widget title="What the search did (newest first)" bodyClass="p-0" flush>
            <div className="max-h-[320px] overflow-auto font-mono text-[12px] py-1">
              {snap.log.length === 0 && <p className="p-3 muted">{snap.polls ? "Runs of more than ten steps are not listed." : "Press step to take the first state from the queue."}</p>}
              {snap.log.map((l, i) => <div key={i} className={`px-3 py-[3px] whitespace-pre ${l.startsWith("take") ? "text-[var(--gold)]" : l.startsWith("skip") ? "muted" : ""}`}>{l}</div>)}
            </div>
          </Widget>
          <div className="panel p-3 text-[13px] flex flex-col gap-2">
            <p>
              <b>Exact search.</b> States are taken in order of decisions, most HP first. A set of cleared monsters and doors is expanded again
              only if a later state reaches it with more HP, so no better route is thrown away.
            </p>
            <p>
              <b>Published search.</b> The solver released with the test maps keeps the first state it takes for each set. On this floor
              both find {floor.published === floor.optimum ? `${floor.optimum} HP` : `different answers (${floor.published} against ${floor.optimum} HP)`};
              on the <Link className="link" href="/floors/complex/">complex floor</Link> the published search reports 22 HP and the exact
              search 68.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
