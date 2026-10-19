"use client";
// Plays a solver route step by step on the map: the exact optimal route or the published solver's route.
import { useEffect, useMemo, useState } from "react";
import { FloorMap, MapLegend } from "./FloorMap";
import { Stat, Widget } from "./Widget";
import { IconNext, IconPause, IconPlay, IconPrev, IconSkipEnd, IconSkipStart } from "./Icons";
import type { FloorSolution } from "@/lib/data-types";
import { parseFloor } from "@/lib/engine/floor";
import { floorMapData } from "@/lib/engine/mapdata";
import { itemTable, posKey } from "@/lib/engine/state";

export function RoutePlayer({ id, text, solution }: { id: string; text: string; solution: FloorSolution }) {
  const floor = useMemo(() => parseFloor(id, text), [id, text]);
  const map = useMemo(() => floorMapData(floor), [floor]);
  const items = useMemo(() => itemTable(floor), [floor]);
  const [mode, setMode] = useState<"exact" | "published">("exact");
  const sol = solution[mode];
  const steps = sol.route;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = steps.length - 1;
  const at = Math.min(idx, last);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => { if (i >= last) { setPlaying(false); return i; } return i + 1; }), 700);
    return () => clearInterval(t);
  }, [playing, last]);

  const removed = useMemo(() => {
    const r = new Set<string>();
    for (let i = 1; i <= at; i++) for (const t of steps[i].tiles) r.add(posKey(t.x, t.y));
    return r;
  }, [steps, at]);
  const step = steps[at];
  const pos = step?.tiles.at(-1) ?? { x: floor.hero.x, y: floor.hero.y };
  const hero = step ? { hp: step.hp, atk: step.atk, def: step.def, x: pos.x, y: pos.y, keys: { yellow: step.keys[0], blue: step.keys[1], red: step.keys[2] } } : null;
  const nameAt = (x: number, y: number) => {
    const t = floor.grid[y][x];
    return floor.monsters[t]?.name ?? items[t]?.name ?? ({ 81: "yellow door", 82: "blue door", 83: "red door" } as Record<number, string>)[t] ?? `tile ${t}`;
  };
  const describe = (i: number) => {
    const s = steps[i];
    if (s.kind === "start") return "Start";
    const names = s.tiles.map((t) => `${nameAt(t.x, t.y)} (${t.x},${t.y})`);
    return names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
  };
  const decisions = steps.filter((s) => s.kind === "decision").length;

  return (
    <div className="grid gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Widget title="Route on the map" className="min-h-[560px]" bodyClass="flex-1 min-h-0 flex flex-col gap-2"
              actions={<div className="tabs" role="tablist" aria-label="solver">
                <button role="tab" aria-selected={mode === "exact"} className="btn btn-sm" onClick={() => { setMode("exact"); setIdx(0); }}>exact solver</button>
                <button role="tab" aria-selected={mode === "published"} className="btn btn-sm" onClick={() => { setMode("published"); setIdx(0); }}>published solver</button>
              </div>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--gap)]">
          <Stat label="HP" value={hero?.hp ?? "–"} sub={`final ${sol.hp ?? "–"}`} />
          <Stat label="ATK / DEF" value={`${hero?.atk ?? "–"} / ${hero?.def ?? "–"}`} />
          <Stat label="Keys" value={hero ? `${hero.keys.yellow} / ${hero.keys.blue} / ${hero.keys.red}` : "–"} sub="yellow / blue / red" />
          <Stat label="Step" value={`${at} / ${last}`} sub={`${decisions} decisions`} />
        </div>
        <div className="h-[clamp(360px,70vh,720px)] shrink-0">
          <FloorMap map={map} hero={hero} removed={removed} path={step?.tiles.map((t) => [t.x, t.y]) ?? null} fit minCell={14} maxCell={60} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button className="btn btn-sm" onClick={() => { setPlaying(false); setIdx(0); }} aria-label="start"><IconSkipStart /></button>
          <button className="btn btn-sm" onClick={() => { setPlaying(false); setIdx(Math.max(0, at - 1)); }} aria-label="previous step"><IconPrev /></button>
          <button className="btn btn-sm btn-primary" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "pause" : "play"}>{playing ? <IconPause /> : <IconPlay />}</button>
          <button className="btn btn-sm" onClick={() => { setPlaying(false); setIdx(Math.min(last, at + 1)); }} aria-label="next step"><IconNext /></button>
          <button className="btn btn-sm" onClick={() => { setPlaying(false); setIdx(last); }} aria-label="end"><IconSkipEnd /></button>
          <input type="range" min={0} max={Math.max(0, last)} value={at} onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
                 className="flex-1 min-w-[140px] mx-2" aria-label="route step" />
        </div>
        <MapLegend />
      </Widget>
      <Widget title={`${mode === "exact" ? "Exact" : "Published"} route · ${sol.hp ?? "no win"} HP`} bodyClass="p-0" flush>
        <p className="px-3 pt-2 pb-1 muted text-[13px]">
          {mode === "exact"
            ? "Every decision clears a door or fight node; items and fights that cost nothing are taken automatically (\"auto\")."
            : "The released solver keeps only the first state it takes from the queue for each cleared set, so it can miss the optimum."}
          {" "}{sol.states.toLocaleString("en")} states expanded.
        </p>
        <div className="step-list max-h-[640px] overflow-auto">
          {steps.map((s, i) => (
            <button key={i} type="button" className={`step w-full text-left ${i === at ? "active" : ""}`} onClick={() => { setPlaying(false); setIdx(i); }}>
              <span className="n">{i}</span>
              <span className="flex-1 truncate">{describe(i)}</span>
              {s.kind === "decision" ? <span className="tag tag-info">decision</span> : s.kind === "auto" ? <span className="tag">auto</span> : null}
              <span className="mono muted text-[12px] w-12 text-right">{s.hp}</span>
            </button>
          ))}
        </div>
      </Widget>
    </div>
  );
}
