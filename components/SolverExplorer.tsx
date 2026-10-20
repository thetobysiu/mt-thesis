"use client";
// Steps through the solver's search on one floor: the merged-node graph, the state taken from the queue, the
// frontier, dominance pruning, and the difference between the exact and the published search. Floors whose search
// takes minutes (complex, hand03) show the stored result instead of searching.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapSkinSelect, TileLayer, useMapSkin, type MapSkin } from "./FloorMap";
import { IconNext, IconPause, IconPlay, IconPrev, IconSkipEnd, IconSkipStart } from "./Icons";
import { Stat, Widget } from "./Widget";
import type { FloorSolution } from "@/lib/data-types";
import { parseFloor, type FloorDef } from "@/lib/engine/floor";
import { floorMapData } from "@/lib/engine/mapdata";
import { itemTable } from "@/lib/engine/state";
import { Graph, Search, javaDamage, type SearchEvent, type SNode, type SolverState } from "@/lib/solver/solver";

const MIN_CELL = 28, MAX_CELL = 56;
const DOOR_FILL: Record<number, string> = { 81: "#EAB308", 82: "#3B82F6", 83: "#EF4444" };
export type SolverFloor = { id: string; title: string; text: string; optimum: number; published: number | null; solution?: FloorSolution };
type Mode = "exact" | "published";
type Layout = "page" | "stage";
type Snapshot = { index: number; polls: number; queue: number; skip: number; push: number; best: SolverState | null; current: SolverState | null; done: boolean; log: string[] };
/** What the graph shows: the nodes a state has cleared, the order of its decisions, and the nodes it can take next. */
type View = { visited: Set<number>; order: Map<number, number>; frontier: Set<number>; hero?: { x: number; y: number } };
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
  return { visited, order, frontier, hero: { x: s.current.y, y: s.current.x } };
}

type ReplayStep = { decision: boolean; nodes: SNode[]; at: { x: number; y: number }; hp: number; atk: number; def: number; mdef?: number; keys: number[] };
type GraphHero = Parameters<typeof javaDamage>[0];

/** One view per decision of a finished route: view k is after decision k and the pickups that follow it (0 = the start). */
function replayOf(g: Graph, steps: ReplayStep[]) {
  const visited = new Set<number>([0]);
  const order = new Map<number, number>();
  const route: RouteRow[] = [];
  const heroes: ReplayStep[] = [];
  const frames: View[] = [];
  let hero = steps[0]?.at ?? { x: 0, y: 0 };
  const snap = (): View => {
    const frontier = new Set<number>();
    for (const n of g.list) if (visited.has(n.id)) for (const m of n.linked) if (!visited.has(m.id)) frontier.add(m.id);
    return { visited: new Set(visited), order: new Map(order), frontier, hero };
  };
  let prev: ReplayStep | null = null;
  for (const s of steps) {
    if (s.decision && prev) { frames.push(snap()); heroes.push(prev); }
    s.nodes.forEach((n) => visited.add(n.id));
    hero = s.at;
    prev = s;
    if (!s.decision) continue;
    route.push({ nodes: s.nodes, hp: s.hp });
    s.nodes.forEach((n) => order.set(n.id, route.length));
  }
  if (prev) { frames.push(snap()); heroes.push(prev); }
  return { frames, route, heroes };
}

type HeroNow = { hp: number; atk: number; def: number; mdef?: number; keys: number[] };

/** The hero as the damage formula needs it; stored results carry no MDEF, so the start value stands in. */
const damageHero = (start: GraphHero, now: HeroNow): GraphHero => ({ ...start, hp: now.hp, atk: now.atk, def: now.def, mdef: now.mdef ?? start.mdef });

/** The hero's stats at the step shown, as in the episode viewer; the HP change is against the step before. */
function HeroStats({ hero, prevHp, startHp }: { hero: HeroNow; prevHp?: number; startHp: number }) {
  const d = prevHp != null ? hero.hp - prevHp : 0;
  return (
    <div className="grid grid-cols-3 gap-[var(--gap)]">
      <Stat label="HP" value={hero.hp} sub={`${d ? `${d > 0 ? "+" : ""}${d} this step · ` : ""}start ${startHp}`}
            tone={hero.hp <= 0 ? "bad" : hero.hp < startHp * 0.2 ? "warn" : undefined} />
      <Stat label="ATK / DEF" value={`${hero.atk} / ${hero.def}`} />
      <Stat label="Keys" value={hero.keys.join(" / ")} sub="yellow / blue / red" />
    </div>
  );
}

const replaySummary = (at: number, h: ReplayStep | undefined) =>
  h ? `${at} decisions · HP ${h.hp} · ATK ${h.atk} / DEF ${h.def} · keys ${h.keys.join("/")}` : "start of the floor";

/** Position and autoplay of a replay; sits at the end until the reader moves it. */
function useReplay(last: number) {
  const [pos, setPos] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const at = Math.min(pos ?? last, last);
  const running = playing && at < last;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setPos(at + 1), 700);
    return () => clearTimeout(t);
  }, [running, at]);

  return {
    at, running,
    stepTo: (v: number) => { setPlaying(false); setPos(Math.max(0, Math.min(last, v))); },
    togglePlay: () => {
      if (running) { setPlaying(false); return; }
      if (at >= last) setPos(0);
      setPlaying(true);
    },
    reset: () => { setPos(null); setPlaying(false); },
  };
}

function ReplayControls({ r, last }: { r: ReturnType<typeof useReplay>; last: number }) {
  return (
    <div className="flex flex-col gap-2">
      <input type="range" min={0} max={last} value={r.at} onChange={(e) => r.stepTo(Number(e.target.value))}
             className="w-full" aria-label="decision" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1" role="group" aria-label="decision controls">
          <button className="btn btn-sm" onClick={() => r.stepTo(0)} aria-label="start"><IconSkipStart /></button>
          <button className="btn btn-sm" onClick={() => r.stepTo(r.at - 1)} aria-label="previous decision"><IconPrev /></button>
          <button className="btn btn-sm btn-primary" onClick={r.togglePlay} aria-label={r.running ? "pause" : "play"}>{r.running ? <IconPause /> : <IconPlay />}</button>
          <button className="btn btn-sm" onClick={() => r.stepTo(r.at + 1)} aria-label="next decision"><IconNext /></button>
          <button className="btn btn-sm" onClick={() => r.stepTo(last)} aria-label="end"><IconSkipEnd /></button>
        </div>
        <span className="mono text-[12px] muted">decision {r.at} / {last}</span>
      </div>
    </div>
  );
}

export function SolverExplorer({ floors, layout = "page" }: { floors: SolverFloor[]; layout?: Layout }) {
  const [floorId, setFloorId] = useState(floors[0].id);
  const [mode, setMode] = useState<Mode>("exact");
  const [skin, setSkin] = useMapSkin();
  const floor = floors.find((f) => f.id === floorId)!;
  return (
    <div className={`flex flex-col gap-[var(--gap)] ${layout === "stage" ? "h-full min-h-0" : ""}`} data-demo={layout === "stage" || undefined}>
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
        ? <StoredRun key={`${floorId}-${mode}`} floor={floor} solution={floor.solution} mode={mode} skin={skin} layout={layout} />
        : <SolverRun key={`${floorId}-${mode}`} floor={floor} mode={mode} skin={skin} layout={layout} />}
    </div>
  );
}

/** Page: graph and a long side column. Stage: graph fitted to the slide height, a short scrolling side column. */
function Layout2({ layout, top, graph, side }: { layout: Layout; top: React.ReactNode; graph: React.ReactNode; side: React.ReactNode }) {
  if (layout === "stage") {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[var(--gap)] flex-1 min-h-0">
        {graph}
        <div className="flex flex-col gap-[var(--gap)] min-h-0 overflow-auto pr-1">{top}{side}</div>
      </div>
    );
  }
  return (
    <>
      {top}
      <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_420px]">
        {graph}
        <div className="flex flex-col gap-[var(--gap)] min-w-0">{side}</div>
      </div>
    </>
  );
}

function SolverRun({ floor, mode, skin, layout }: { floor: SolverFloor; mode: Mode; skin: MapSkin; layout: Layout }) {
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
    rp.reset();
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
  const finished = snap.done && best != null;
  const replay = useMemo(() => finished ? replayOf(g, best.route.map((r) => ({
    decision: r.kind === "decision", nodes: g.list.filter((m) => m.id === r.nodeId), at: r.tiles[0],
    hp: r.hero.hp, atk: r.hero.atk, def: r.hero.def, mdef: r.hero.mdef, keys: [r.hero.yellow, r.hero.blue, r.hero.red],
  }))) : null, [g, finished, best]);
  const rp = useReplay(replay?.route.length ?? 0);
  const shown = finished ? best : snap.current;
  const current = snap.current;
  const view = useMemo(() => replay ? replay.frames[rp.at] : viewOf(g, current), [g, replay, rp.at, current]);
  const route: RouteRow[] = replay ? replay.route : shown ? shown.route.filter((r) => r.kind === "decision")
    .map((r) => ({ nodes: g.list.filter((m) => m.id === r.nodeId), hp: r.hero.hp })) : [];
  const startHero = g.list[0].hero!;
  const heroOf = (h: GraphHero): HeroNow => ({ hp: h.hp, atk: h.atk, def: h.def, mdef: h.mdef, keys: [h.yellow, h.blue, h.red] });
  const nowHero = replay ? replay.heroes[rp.at] ?? heroOf(startHero) : heroOf(shown?.current.hero ?? startHero);
  const prevHp = replay ? replay.heroes[rp.at - 1]?.hp
    : shown ? shown.route[shown.route.findLastIndex((r) => r.kind === "decision") - 1]?.hero.hp : undefined;

  return (
    <Layout2 layout={layout}
      top={<>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-sm" onClick={() => advance(1)} disabled={snap.done}>step</button>
          <button className="btn btn-sm" onClick={() => advance(10)} disabled={snap.done}>+10</button>
          <button className="btn btn-sm" onClick={() => advance(100)} disabled={snap.done}>+100</button>
          <button className="btn btn-sm btn-primary" onClick={() => setRunning((v) => !v)} disabled={snap.done}>{running ? "pause" : "run to the end"}</button>
          <button className="btn btn-sm" onClick={reset}>reset</button>
        </div>
        {replay && <ReplayControls r={rp} last={replay.route.length} />}
      </>}
      graph={<SearchGraph g={g} def={def} view={view} name={name} skin={skin} hero={damageHero(startHero, nowHero)} fit={layout === "stage"} />}
      side={<>
          <HeroStats hero={nowHero} prevHp={prevHp} startHp={startHero.hp} />
          <div className="grid grid-cols-2 gap-[var(--gap)]">
            <Stat label="Expanded" value={snap.index.toLocaleString("en")} sub={`${snap.polls} taken from the queue`} />
            <Stat label="Queue" value={snap.queue} sub={`${snap.push} queued in total`} />
            <Stat label="Skipped" value={snap.skip} sub={mode === "exact" ? "set already expanded with ≥ HP" : "set already taken"} />
            <Stat label="Best so far" value={best ? `${best.score} HP` : "–"} tone={best?.bossDead ? "ok" : undefined}
                  sub={snap.done ? `finished · optimum ${floor.optimum}` : `optimum ${floor.optimum}`} />
          </div>
          {shown && (
            replay
              ? <RouteList title={rp.at === replay.route.length ? "Best state found" : `State after decision ${rp.at}`} route={route} name={name} at={rp.at} onPick={rp.stepTo}
                           summary={replaySummary(rp.at, replay.heroes[rp.at])} />
              : <RouteList title="State just taken" route={route} name={name}
                           summary={`${shown.cnt} decisions · HP ${shown.score} · ATK ${shown.current.hero!.atk} / DEF ${shown.current.hero!.def} · keys ${shown.current.hero!.yellow}/${shown.current.hero!.blue}/${shown.current.hero!.red}`} />
          )}
          {layout === "page" && <>
          <Widget title="What the search did (newest first)" bodyClass="p-0" flush>
            <div className="max-h-[320px] overflow-auto font-mono text-[12px] py-1">
              {snap.log.length === 0 && <p className="p-3 muted">{snap.polls ? "Runs of more than ten steps are not listed." : "Press step to take the first state from the queue."}</p>}
              {snap.log.map((l, i) => <div key={i} className={`px-3 py-[3px] whitespace-pre ${l.startsWith("take") ? "text-[var(--gold)]" : l.startsWith("skip") ? "muted" : ""}`}>{l}</div>)}
            </div>
          </Widget>
          <SearchNotes floor={floor} />
          </>}
      </>} />
  );
}

/** Complex and hand03: the stored exact or published result on the same graph, without running the search. */
function StoredRun({ floor, solution, mode, skin, layout }: { floor: SolverFloor; solution: FloorSolution; mode: Mode; skin: MapSkin; layout: Layout }) {
  const def = useMemo(() => parseFloor(floor.id, floor.text), [floor]);
  const name = useMemo(() => nodeNamer(def), [def]);
  const g = useMemo(() => new Graph(floor.text), [floor.text]);
  const sol = solution[mode];
  const { frames, route, heroes } = useMemo(() => {
    const byTile = new Map<string, SNode>();
    for (const n of g.list) for (const p of [n, ...n.parts]) byTile.set(`${p.y},${p.x}`, n);
    return replayOf(g, sol.route.map((s) => ({
      decision: s.kind === "decision",
      at: s.tiles[0],
      nodes: [...new Set(s.tiles.map((t) => byTile.get(`${t.x},${t.y}`)).filter((n): n is SNode => !!n))],
      hp: s.hp, atk: s.atk, def: s.def, keys: s.keys,
    })));
  }, [g, sol]);
  const last = route.length;
  const rp = useReplay(last);
  const { at } = rp;
  const view = frames[at];
  const hero = heroes[at];
  const start = heroes[0];

  return (
    <Layout2 layout={layout}
      top={<>
        <div className="panel p-3 text-[13px] max-w-[90ch]">
          This floor&apos;s search takes minutes and a lot of memory, so it does not run in the browser. The graph shows the best state of
          the stored {mode} search, computed once with the same solver; the other floors run live. Step through its decisions below.
        </div>
        <ReplayControls r={rp} last={last} />
      </>}
      graph={<SearchGraph g={g} def={def} view={view} name={name} skin={skin} hero={damageHero(g.list[0].hero!, hero ?? start)} fit={layout === "stage"} />}
      side={<>
          {hero && <HeroStats hero={hero} prevHp={heroes[at - 1]?.hp} startHp={start.hp} />}
          <div className="grid grid-cols-2 gap-[var(--gap)]">
            <Stat label="States" value={sol.states.toLocaleString("en")} sub={`expanded by the ${mode} search`} />
            <Stat label="Winning sets" value={sol.winningSets.toLocaleString("en")} sub="sets of cleared nodes that defeat the boss" />
            <Stat label="Best" value={sol.hp != null ? `${sol.hp} HP` : "–"} tone={sol.hp === floor.optimum ? "ok" : undefined} sub={`optimum ${floor.optimum}`} />
            <Stat label="Decisions" value={route.length} sub="on the route below" />
          </div>
          <RouteList title={at === last ? "Best state found" : "State after decision " + at} route={route} name={name} at={at} onPick={rp.stepTo}
                     summary={replaySummary(at, hero)} />
          {layout === "page" && <SearchNotes floor={floor} />}
      </>} />
  );
}

function RouteList({ title, summary, route, name, at, onPick }: { title: string; summary: string; route: RouteRow[]; name: (n: SNode) => string; at?: number; onPick?: (decision: number) => void }) {
  return (
    <div className="panel p-3 text-[13px]">
      <b>{title}:</b> {summary}
      {route.length > 0 && (
        <ol className="mt-2 flex flex-col gap-1 font-mono text-[12px]">
          {route.map((r, i) => {
            const cls = `grid grid-cols-[1.6rem_1fr_auto] gap-2 items-baseline w-full text-left rounded-sm px-1 ${at != null && i + 1 > at ? "opacity-40" : ""} ${at === i + 1 ? "bg-[var(--border-soft)]" : ""}`;
            const cells = (
              <>
                <span className="text-right text-[var(--gold)]">{i + 1}</span>
                <span>{r.nodes.map(name).join(", ") || "–"}</span>
                <span className="muted whitespace-nowrap">→ {r.hp} HP</span>
              </>
            );
            return (
              <li key={i}>
                {onPick ? <button type="button" className={cls} onClick={() => onPick(i + 1)} aria-current={at === i + 1 || undefined}>{cells}</button> : <div className={cls}>{cells}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function SearchGraph({ g, def, view, name, skin, hero, fit = false }: { g: Graph; def: FloorDef; view: View; name: (n: SNode) => string; skin: MapSkin; hero: GraphHero; fit?: boolean }) {
  const tiles = skin === "game";
  const wrap = useRef<HTMLDivElement>(null);
  const [CELL, setCell] = useState(40);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const byWidth = (el.clientWidth - 16) / g.cols;
      const byHeight = fit ? (el.clientHeight - 8) / g.rows : (window.innerHeight * 0.8) / g.rows;
      setCell(Math.max(fit ? 16 : MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(byWidth, byHeight)))));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    measure();
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [g, fit]);
  const map = useMemo(() => floorMapData(def), [def]);
  const removed = useMemo(() => new Set(g.list.filter((n) => n.id !== 0 && view.visited.has(n.id))
    .flatMap((n) => [n, ...n.parts]).map((p) => `${p.y},${p.x}`)), [g, view]);
  const anchor = (n: SNode) => { const p = n.parts[0] ?? n; return { cx: (p.y + 0.5) * CELL, cy: (p.x + 0.5) * CELL }; };
  const fill = (n: SNode) => n.type === 0 ? "var(--gold)" : n.type === 299 ? "#A855F7" : n.item ? "#22C55E" : n.doors.length ? DOOR_FILL[n.type] ?? "#EAB308" : "#F87171";
  const w = g.cols * CELL, h = g.rows * CELL;

  return (
    <Widget title="Search graph" bodyClass={fit ? "flex-1 min-h-0" : "scroll-x"} className={fit ? "min-h-0" : ""}>
      <div ref={wrap} className={`w-full flex justify-center ${fit ? "h-full items-center" : ""}`}>
      <div className="board inline-block">
      <div className="relative" style={{ width: w, height: h }}>
        {tiles && <TileLayer map={map} cell={CELL} removed={removed} hero={view.hero ?? { x: def.hero.x, y: def.hero.y }} />}
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
            const here = view.hero != null && view.hero.x === (n.parts[0] ?? n).y && view.hero.y === (n.parts[0] ?? n).x;
            const label = !tiles && here ? "@" : step != null ? String(step) : "";
            const tip = `node ${n.id}: ${name(n)}${step != null ? ` · decision ${step}` : ""}${visited ? " (cleared in this state)" : next ? " (can be taken next)" : ""}`;
            const tiles_ = n.parts.length ? n.parts : [n];
            return (
              <g key={n.id}>
                {!tiles && n.parts.slice(1).map((p, i) => <circle key={i} cx={(p.y + 0.5) * CELL} cy={(p.x + 0.5) * CELL} r={4} fill={fill(n)} opacity={visited ? 0.9 : 0.4} />)}
                {tiles ? (
                  <>
                    <rect x={a.cx - CELL / 2 + 1.5} y={a.cy - CELL / 2 + 1.5} width={CELL - 3} height={CELL - 3} rx={6} fill={visited ? fill(n) : "none"} fillOpacity={0.18}
                          stroke={next ? "#FBBF24" : fill(n)} strokeWidth={next ? 3 : visited ? 2.5 : 1.5} strokeOpacity={visited || next ? 1 : 0.6} />
                    {label && <>
                      <circle cx={a.cx - CELL / 2 + 8} cy={a.cy - CELL / 2 + 8} r={8} fill="#FBBF24" stroke="#0B1220" strokeWidth={1} pointerEvents="none" />
                      <text x={a.cx - CELL / 2 + 8} y={a.cy - CELL / 2 + 11.5} textAnchor="middle" fontSize={10} fontWeight={700} fontFamily="var(--font-mono)" fill="#0B1220" pointerEvents="none">{label}</text>
                    </>}
                  </>
                ) : (
                  <>
                    <circle cx={a.cx} cy={a.cy} r={CELL * 0.3} fill={fill(n)} opacity={visited ? 1 : 0.35}
                            stroke={next ? "#FBBF24" : visited ? "#F8FAFC" : "none"} strokeWidth={next ? 3 : 1} />
                    <text x={a.cx} y={a.cy + 3.5} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily="var(--font-mono)" fill="#0B1220" pointerEvents="none">{label}</text>
                  </>
                )}
                {tiles_.map((p, i) => {
                  const t = def.grid[p.x]?.[p.y];
                  const mon = n.id !== 0 ? g.monsterMap.get(t) : undefined;
                  const cost = mon ? javaDamage(hero, mon) : null;
                  const lost = cost != null && cost >= 999999999;
                  const win = cost != null && !lost && cost < hero.hp;
                  const mtip = mon ? `\n${def.monsters[t]?.name ?? "monster"}: HP ${mon.hp}  ATK ${mon.atk}  DEF ${mon.def}  gold ${mon.money}\n${lost ? "cannot be beaten at the hero's ATK" : `costs ${cost} HP to kill now`}` : "";
                  const x0 = p.y * CELL, y0 = p.x * CELL;
                  return (
                    <g key={`t${i}`}>
                      {mon && !visited && cost != null && CELL >= 24 && (
                        <text x={x0 + 3} y={y0 + CELL - 3} fontSize={Math.max(9, Math.round(CELL * 0.3))} fontWeight={700} fontFamily="var(--font-mono)"
                              fill={win ? "#86EFAC" : "#FCA5A5"} stroke="#000" strokeWidth={2.5} paintOrder="stroke" pointerEvents="none">{lost ? "!" : cost}</text>
                      )}
                      <rect x={x0} y={y0} width={CELL} height={CELL} fill="transparent"><title>{`${tip}${mtip}`}</title></rect>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      </div>
      </div>
      {!fit && <p className="muted text-[13px] mt-2">
        {tiles ? "One frame per node over the game's tiles: monsters red (boss purple), doors in their colour, items green, the start gold; cleared nodes are filled and their tiles emptied. "
          : "One circle per node: monsters red (boss purple), doors in their colour, items green, the start gold. "}
        Items next to each other are merged into one node (dashed lines), as are chains of monsters and doors with nothing else attached.
        Lines join nodes the hero can walk between. Numbers give the order of the decisions in the state shown ({tiles ? "the hero marks the start" : "@ = start"}; items picked up
        on the way are not numbered): the state just taken from the queue, and once the search ends the best state. Gold ring: the nodes it
        can take next. The number on a monster is the HP it costs to kill at the hero&apos;s current stats (green: affordable, red: not, !: cannot
        be beaten). Hover a tile for its node and monster stats.
      </p>}
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
