"use client";
// Steps through the solver's search on one floor: the merged-node graph, the state taken from the queue, the
// frontier, dominance pruning, and the difference between the exact and the published search. Floors whose search
// takes minutes (complex, hand03) show the stored result instead of searching.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapSkinSelect, TileLayer, useMapSkin, type MapSkin } from "./FloorMap";
import { Stat, Widget } from "./Widget";
import type { FloorSolution } from "@/lib/data-types";
import { parseFloor, type FloorDef } from "@/lib/engine/floor";
import { floorMapData } from "@/lib/engine/mapdata";
import { itemTable } from "@/lib/engine/state";
import { Graph, Search, type SearchEvent, type SNode, type SolverState } from "@/lib/solver/solver";

const CELL = 40;
const DOOR_FILL: Record<number, string> = { 81: "#EAB308", 82: "#3B82F6", 83: "#EF4444" };
export type SolverFloor = { id: string; title: string; text: string; optimum: number; published: number | null; solution?: FloorSolution };
type Mode = "exact" | "published";
type Snapshot = { index: number; polls: number; queue: number; skip: number; push: number; best: SolverState | null; current: SolverState | null; done: boolean; log: string[] };
/** What the graph shows: the nodes a state has cleared, the order of its decisions, and the nodes it can take next. */
type View = { visited: Set<number>; order: Map<number, number>; frontier: Set<number> };
type RouteRow = { nodes: SNode[]; hp: number };

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
  constructor(text: string, readonly mode: Mode, private name: (n: SNode) => string) {
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

/** The view of a live search state: cleared nodes, decision order, frontier. */
function viewOf(g: Graph, s: SolverState | null): View {
  if (!s) return { visited: new Set([0]), order: new Map(), frontier: new Set() };
  const visited = new Set(g.list.filter((n) => s.visited[n.id]).map((n) => n.id));
  const order = new Map<number, number>();
  s.route.filter((r) => r.kind === "decision").forEach((r, i) => order.set(r.nodeId, i + 1));
  const frontier = new Set([...s.current.linked].filter((n) => !s.visited[n.id]).map((n) => n.id));
  return { visited, order, frontier };
}

export function SolverExplorer({ floors }: { floors: SolverFloor[] }) {
  const [floorId, setFloorId] = useState(floors[0].id);
  const [mode, setMode] = useState<Mode>("exact");
  const [skin, setSkin] = useMapSkin();
  const floor = floors.find((f) => f.id === floorId)!;
  return (
    <div className="flex flex-col gap-[var(--gap)]">
      <div className="toolbar flex flex-wrap items-center gap-2">
        <select className="input" value={floorId} onChange={(e) => setFloorId(e.target.value)} aria-label="floor">
          {floors.map((f) => <option key={f.id} value={f.id}>{f.title}{f.solution ? " (stored result)" : ""}</option>)}
        </select>
        <div className="tabs" role="tablist" aria-label="search">
          <button role="tab" aria-selected={mode === "exact"} className="btn btn-sm" onClick={() => setMode("exact")}>exact search</button>
          <button role="tab" aria-selected={mode === "published"} className="btn btn-sm" onClick={() => setMode("published")}>published search</button>
        </div>
        <MapSkinSelect skin={skin} setSkin={setSkin} />
      </div>
      {floor.solution
        ? <StoredRun key={`${floorId}-${mode}`} floor={floor} solution={floor.solution} mode={mode} skin={skin} />
        : <SolverRun key={`${floorId}-${mode}`} floor={floor} mode={mode} skin={skin} />}
    </div>
  );
}

function SolverRun({ floor, mode, skin }: { floor: SolverFloor; mode: Mode; skin: MapSkin }) {
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
  const shown = snap.done && best ? best : snap.current;
  const view = useMemo(() => viewOf(g, shown), [g, shown]);
  const route: RouteRow[] = shown ? shown.route.filter((r) => r.kind === "decision")
    .map((r) => ({ nodes: g.list.filter((m) => m.id === r.nodeId), hp: r.hero.hp })) : [];

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
        <SearchGraph g={g} def={def} view={view} name={name} skin={skin} />
        <div className="flex flex-col gap-[var(--gap)] min-w-0">
          <div className="grid grid-cols-2 gap-[var(--gap)]">
            <Stat label="Expanded" value={snap.index.toLocaleString("en")} sub={`${snap.polls} taken from the queue`} />
            <Stat label="Queue" value={snap.queue} sub={`${snap.push} queued in total`} />
            <Stat label="Skipped" value={snap.skip} sub={mode === "exact" ? "set already expanded with ≥ HP" : "set already taken"} />
            <Stat label="Best so far" value={best ? `${best.score} HP` : "–"} tone={best?.bossDead ? "ok" : undefined}
                  sub={snap.done ? `finished · optimum ${floor.optimum}` : `optimum ${floor.optimum}`} />
          </div>
          {shown && (
            <RouteList title={snap.done && best ? "Best state found" : "State just taken"} route={route} name={name}
                       summary={`${shown.cnt} decisions · HP ${shown.score} · ATK ${shown.current.hero!.atk} / DEF ${shown.current.hero!.def} · keys ${shown.current.hero!.yellow}/${shown.current.hero!.blue}/${shown.current.hero!.red}`} />
          )}
          <Widget title="What the search did (newest first)" bodyClass="p-0" flush>
            <div className="max-h-[320px] overflow-auto font-mono text-[12px] py-1">
              {snap.log.length === 0 && <p className="p-3 muted">{snap.polls ? "Runs of more than ten steps are not listed." : "Press step to take the first state from the queue."}</p>}
              {snap.log.map((l, i) => <div key={i} className={`px-3 py-[3px] whitespace-pre ${l.startsWith("take") ? "text-[var(--gold)]" : l.startsWith("skip") ? "muted" : ""}`}>{l}</div>)}
            </div>
          </Widget>
          <SearchNotes floor={floor} />
        </div>
      </div>
    </>
  );
}

/** Complex and hand03: the stored exact or published result on the same graph, without running the search. */
function StoredRun({ floor, solution, mode, skin }: { floor: SolverFloor; solution: FloorSolution; mode: Mode; skin: MapSkin }) {
  const def = useMemo(() => parseFloor(floor.id, floor.text), [floor]);
  const name = useMemo(() => nodeNamer(def), [def]);
  const g = useMemo(() => new Graph(floor.text), [floor.text]);
  const sol = solution[mode];
  const { view, route } = useMemo(() => {
    const at = new Map<string, SNode>();
    for (const n of g.list) for (const p of [n, ...n.parts]) at.set(`${p.y},${p.x}`, n);
    const visited = new Set<number>([0]);
    const order = new Map<number, number>();
    const rows: RouteRow[] = [];
    for (const s of sol.route) {
      const nodes = [...new Set(s.tiles.map((t) => at.get(`${t.x},${t.y}`)).filter((n): n is SNode => !!n))];
      nodes.forEach((n) => visited.add(n.id));
      if (s.kind !== "decision") continue;
      rows.push({ nodes, hp: s.hp });
      nodes.forEach((n) => order.set(n.id, rows.length));
    }
    return { view: { visited, order, frontier: new Set<number>() }, route: rows };
  }, [g, sol]);
  const last = sol.route.at(-1);

  return (
    <>
      <div className="panel p-3 text-[13px] max-w-[90ch]">
        This floor&apos;s search takes minutes and a lot of memory, so it does not run in the browser. The graph shows the best state of
        the stored {mode} search, computed once with the same solver; the other floors run live.
      </div>
      <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_420px]">
        <SearchGraph g={g} def={def} view={view} name={name} skin={skin} />
        <div className="flex flex-col gap-[var(--gap)] min-w-0">
          <div className="grid grid-cols-2 gap-[var(--gap)]">
            <Stat label="States" value={sol.states.toLocaleString("en")} sub={`expanded by the ${mode} search`} />
            <Stat label="Winning sets" value={sol.winningSets.toLocaleString("en")} sub="sets of cleared nodes that defeat the boss" />
            <Stat label="Best" value={sol.hp != null ? `${sol.hp} HP` : "–"} tone={sol.hp === floor.optimum ? "ok" : undefined} sub={`optimum ${floor.optimum}`} />
            <Stat label="Decisions" value={route.length} sub="on the route below" />
          </div>
          <RouteList title="Best state found" route={route} name={name}
                     summary={last ? `${route.length} decisions · HP ${last.hp} · ATK ${last.atk} / DEF ${last.def} · keys ${last.keys.join("/")}` : ""} />
          <SearchNotes floor={floor} />
        </div>
      </div>
    </>
  );
}

function RouteList({ title, summary, route, name }: { title: string; summary: string; route: RouteRow[]; name: (n: SNode) => string }) {
  return (
    <div className="panel p-3 text-[13px]">
      <b>{title}:</b> {summary}
      {route.length > 0 && (
        <ol className="mt-2 flex flex-col gap-1 font-mono text-[12px]">
          {route.map((r, i) => (
            <li key={i} className="grid grid-cols-[1.6rem_1fr_auto] gap-2 items-baseline">
              <span className="text-right text-[var(--gold)]">{i + 1}</span>
              <span>{r.nodes.map(name).join(", ") || "–"}</span>
              <span className="muted whitespace-nowrap">→ {r.hp} HP</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SearchGraph({ g, def, view, name, skin }: { g: Graph; def: FloorDef; view: View; name: (n: SNode) => string; skin: MapSkin }) {
  const tiles = skin === "game";
  const map = useMemo(() => floorMapData(def), [def]);
  const removed = useMemo(() => new Set(g.list.filter((n) => n.id !== 0 && view.visited.has(n.id))
    .flatMap((n) => [n, ...n.parts]).map((p) => `${p.y},${p.x}`)), [g, view]);
  const anchor = (n: SNode) => { const p = n.parts[0] ?? n; return { cx: (p.y + 0.5) * CELL, cy: (p.x + 0.5) * CELL }; };
  const fill = (n: SNode) => n.type === 0 ? "var(--gold)" : n.type === 299 ? "#A855F7" : n.item ? "#22C55E" : n.doors.length ? DOOR_FILL[n.type] ?? "#EAB308" : "#F87171";
  const w = g.cols * CELL, h = g.rows * CELL;

  return (
    <Widget title="Search graph" bodyClass="scroll-x">
      <div className="board inline-block">
      <div className="relative" style={{ width: w, height: h }}>
        {tiles && <TileLayer map={map} cell={CELL} removed={removed} hero={{ x: def.hero.x, y: def.hero.y }} />}
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block absolute inset-0" role="img" aria-label="merged node graph of the floor">
          {!tiles && g.map[0].map((row, r) => row.map((t, c) => (
            <rect key={`${r},${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill={t === 1 ? "#1E293B" : "#0B1220"} stroke="#111827" />
          )))}
          {g.list.map((n) => [...n.linked].filter((m) => m.id > n.id).map((m) => {
            const a = anchor(n), b = anchor(m);
            const on = view.visited.has(n.id) && view.visited.has(m.id);
            return <line key={`${n.id}-${m.id}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke={on ? "#FBBF24" : tiles ? "#E2E8F0" : "#475569"}
                         strokeOpacity={on ? 0.9 : tiles ? 0.35 : 0.45} strokeWidth={on ? 2.5 : 1} />;
          }))}
          {g.list.map((n) => n.parts.slice(1).map((p, i) => {
            const a = anchor(n);
            return <line key={`p${n.id}-${i}`} x1={a.cx} y1={a.cy} x2={(p.y + 0.5) * CELL} y2={(p.x + 0.5) * CELL} stroke={fill(n)} strokeDasharray="3 3" strokeOpacity={0.8} />;
          }))}
          {g.list.map((n) => {
            const a = anchor(n);
            const visited = view.visited.has(n.id);
            const next = view.frontier.has(n.id);
            const step = view.order.get(n.id);
            const label = n.id === 0 ? (tiles ? "" : "@") : step != null ? String(step) : "";
            const tip = `node ${n.id}: ${name(n)}${step != null ? ` · decision ${step}` : ""}${visited ? " (cleared in this state)" : next ? " (can be taken next)" : ""}`;
            return (
              <g key={n.id}>
                {!tiles && n.parts.slice(1).map((p, i) => <circle key={i} cx={(p.y + 0.5) * CELL} cy={(p.x + 0.5) * CELL} r={4} fill={fill(n)} opacity={visited ? 0.9 : 0.4} />)}
                {tiles ? (
                  <>
                    <rect x={a.cx - CELL / 2 + 1.5} y={a.cy - CELL / 2 + 1.5} width={CELL - 3} height={CELL - 3} rx={6} fill={visited ? fill(n) : "none"} fillOpacity={0.18}
                          stroke={next ? "#FBBF24" : fill(n)} strokeWidth={next ? 3 : visited ? 2.5 : 1.5} strokeOpacity={visited || next ? 1 : 0.6}>
                      <title>{tip}</title>
                    </rect>
                    {label && <>
                      <circle cx={a.cx - CELL / 2 + 8} cy={a.cy - CELL / 2 + 8} r={8} fill="#FBBF24" stroke="#0B1220" strokeWidth={1} pointerEvents="none" />
                      <text x={a.cx - CELL / 2 + 8} y={a.cy - CELL / 2 + 11.5} textAnchor="middle" fontSize={10} fontWeight={700} fontFamily="var(--font-mono)" fill="#0B1220" pointerEvents="none">{label}</text>
                    </>}
                  </>
                ) : (
                  <>
                    <circle cx={a.cx} cy={a.cy} r={CELL * 0.3} fill={fill(n)} opacity={visited ? 1 : 0.35}
                            stroke={next ? "#FBBF24" : visited ? "#F8FAFC" : "none"} strokeWidth={next ? 3 : 1}>
                      <title>{tip}</title>
                    </circle>
                    <text x={a.cx} y={a.cy + 3.5} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="var(--font-mono)" fill="#0B1220" pointerEvents="none">{label}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      </div>
      <p className="muted text-[13px] mt-2">
        {tiles ? "One frame per node over the game's tiles: monsters red (boss purple), doors in their colour, items green, the start gold; cleared nodes are filled and their tiles emptied. "
          : "One circle per node: monsters red (boss purple), doors in their colour, items green, the start gold. "}
        Items next to each other are merged into one node (dashed lines), as are chains of monsters and doors with nothing else attached.
        Lines join nodes the hero can walk between. Numbers give the order of the decisions in the state shown ({tiles ? "the hero marks the start" : "@ = start"}; items picked up
        on the way are not numbered): the state just taken from the queue, and once the search ends the best state. Gold ring: the nodes it
        can take next. Hover a node for its name.
      </p>
    </Widget>
  );
}

function SearchNotes({ floor }: { floor: SolverFloor }) {
  return (
    <div className="panel p-3 text-[13px] flex flex-col gap-2">
      <p>
        <b>Exact search.</b> States are taken in order of decisions (breadth first), most HP first. A set of cleared monsters and doors is
        expanded again only if a later state reaches it with more HP, so no better route is thrown away.
      </p>
      <p>
        <b>Published search.</b> The solver released with the test maps keeps the first state it takes for each set. On this floor
        both find {floor.published === floor.optimum ? `${floor.optimum} HP` : `different answers (${floor.published} against ${floor.optimum} HP)`};
        on the <Link className="link" href="/floors/complex/">complex floor</Link> the published search reports 22 HP and the exact
        search 68.
      </p>
    </div>
  );
}
