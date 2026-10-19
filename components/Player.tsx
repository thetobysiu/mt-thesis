"use client";
// Play a single floor on the thesis engine (TypeScript port): click a ringed tile or an action; optional solver hints
// show, for every legal action, the best final HP still reachable after it.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FloorMap, MapLegend, MapSkinSelect, useMapSkin } from "./FloorMap";
import { Stat, Widget } from "./Widget";
import { parseFloor } from "@/lib/engine/floor";
import { floorMapData, heroOf } from "@/lib/engine/mapdata";
import { GameState, posKey, type Action } from "@/lib/engine/state";
import { stateText } from "@/lib/solver/solver";
import { stateValues } from "@/lib/solver/client";
import { HEAVY_FLOORS } from "./ValueStrip";

type Entry = { state: GameState; label: string; assisted: boolean; hp: number };

function withAssists(s: GameState, on: boolean): { state: GameState; log: Entry[]; stuck: string | null } {
  const log: Entry[] = [];
  let cur = s;
  if (!on) return { state: cur, log, stuck: null };
  for (let guard = 0; guard < 200 && !cur.goalReached && !cur.failed; guard++) {
    const a = cur.assist();
    if (!a) break;
    if ("stuck" in a) return { state: cur, log, stuck: a.stuck };
    const next = cur.clone();
    next.apply(a.action);
    log.push({ state: next, label: `${a.action.label} (${a.reason})`, assisted: true, hp: next.hero.hp });
    cur = next;
  }
  return { state: cur, log, stuck: null };
}

const valueKey = (s: GameState) => stateText(s.floor.text, s.floor.height, s.hero, s.removed);

export function Player({ id, text, optimum, title }: { id: string; text: string; optimum: number | null; title: string }) {
  const floor = useMemo(() => parseFloor(id, text), [id, text]);
  const map = useMemo(() => floorMapData(floor), [floor]);
  const [assists, setAssists] = useState(true);
  const [hintsOn, setHints] = useState(false);
  const heavy = HEAVY_FLOORS.has(id);
  const hints = hintsOn && !heavy;
  const [skin, setSkin] = useMapSkin();
  const [history, setHistory] = useState<Entry[]>(() => {
    const s0 = new GameState(floor);
    const { log } = withAssists(s0, true);
    return [{ state: s0, label: "Start", assisted: false, hp: s0.hero.hp }, ...log];
  });
  const [values, setValues] = useState<Map<string, number | null>>(new Map());
  const [busy, setBusy] = useState(false);

  const state = history[history.length - 1].state;
  const actions = useMemo(() => (state.goalReached || state.failed ? [] : state.actions()), [state]);
  const stuck = !state.goalReached && !state.failed && (actions.length === 0 || actions.every((a) => a.type === "fight" && !a.canWin));
  const outcomes = useMemo(() => actions.map((a) => {
    const n = state.clone();
    n.apply(a);
    return n;
  }), [actions, state]);

  const valueOf = (s: GameState): number | null | undefined => {
    if (s.goalReached) return s.hero.hp;
    if (s.failed) return null;
    return values.get(valueKey(s));
  };

  useEffect(() => {
    if (!hints) return;
    const pending = [state, ...outcomes].filter((s) => !s.goalReached && !s.failed).map(valueKey).filter((k) => !values.has(k));
    if (!pending.length) return;
    let live = true;
    Promise.resolve().then(() => { if (live) setBusy(true); });
    stateValues(pending).then((vals) => {
      if (!live) return;
      setValues((prev) => {
        const m = new Map(prev);
        pending.forEach((k, i) => m.set(k, vals[i]));
        return m;
      });
    }).catch(() => {}).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [hints, state, outcomes, values]);

  const take = (a: Action) => {
    const next = state.clone();
    next.apply(a);
    const { log } = withAssists(next, assists);
    setHistory((h) => [...h, { state: next, label: a.label, assisted: false, hp: next.hero.hp }, ...log]);
  };
  const undo = () => setHistory((h) => {
    let k = h.length - 1;
    while (k > 0 && h[k].assisted) k--;  // drop the last own decision with the assists that followed it
    return k > 0 ? h.slice(0, k) : h;
  });
  const restart = () => setHistory(() => {
    const s0 = new GameState(floor);
    const { log } = withAssists(s0, assists);
    return [{ state: s0, label: "Start", assisted: false, hp: s0.hero.hp }, ...log];
  });

  const highlight = useMemo(() => new Set(actions.map((a) => posKey(a.x, a.y))), [actions]);
  const labels = useMemo(() => Object.fromEntries(actions.map((a) => [posKey(a.x, a.y), String(a.id)])), [actions]);
  const onCell = (x: number, y: number) => {
    const a = actions.find((v) => v.x === x && v.y === y);
    if (a) take(a);
  };
  const current = hints ? valueOf(state) : undefined;
  const h = state.hero;

  return (
    <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_440px]">
      <Widget title={title} className="min-h-[620px]" bodyClass="flex-1 min-h-0 flex flex-col gap-2"
              actions={<>
                <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={assists} onChange={(e) => setAssists(e.target.checked)} /> engine assists</label>
                <label className="flex items-center gap-1 text-[13px]" title={heavy ? "On this floor the exact search takes minutes; hints are off" : "Best final HP still reachable after each action"}>
                  <input type="checkbox" checked={hints} disabled={heavy} onChange={(e) => setHints(e.target.checked)} /> solver hints{heavy ? " (off on this floor)" : ""}
                </label>
                <MapSkinSelect skin={skin} setSkin={setSkin} />
              </>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--gap)]">
          <Stat label="HP" value={h.hp} tone={h.hp <= 0 ? "bad" : undefined} sub={hints ? (current === undefined ? "state value …" : current == null ? "floor lost" : `state value ${current}`) : `start ${floor.hero.hp}`} />
          <Stat label="ATK / DEF" value={`${h.atk} / ${h.def}`} sub={`position (${h.x},${h.y})`} />
          <Stat label="Keys" value={`${h.yellow} / ${h.blue} / ${h.red}`} sub="yellow / blue / red" />
          <Stat label="Turn" value={state.turn} sub={`optimum ${optimum ?? "–"} HP`} />
        </div>
        <div className="flex-1 min-h-[380px]">
          <FloorMap map={map} hero={heroOf(state)} removed={state.removed} fit minCell={16} maxCell={64}
                    highlight={highlight} labels={labels} onCellClick={onCell} skin={skin} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-sm" onClick={undo} disabled={history.length <= 1}>Undo</button>
          <button className="btn btn-sm" onClick={restart}>Restart</button>
          <MapLegend skin={skin} />
        </div>
      </Widget>

      <div className="flex flex-col gap-[var(--gap)] min-w-0">
        {(state.goalReached || state.failed || stuck) && (
          <div className={`panel p-4 ${state.goalReached ? "border-[var(--ok)]" : "border-[var(--bad)]"}`} role="status">
            {state.goalReached
              ? <p className="text-[16px]"><b className="text-[var(--ok)]">Boss defeated</b> with {h.hp} HP{optimum != null ? ` (optimum ${optimum}: ${Math.round((h.hp / optimum) * 100)} %)` : ""}.</p>
              : state.failed ? <p className="text-[16px]"><b className="text-[var(--bad)]">The hero died.</b> Undo, or restart.</p>
              : <p className="text-[16px]"><b className="text-[var(--bad)]">Stuck:</b> only fights the hero cannot win remain.</p>}
          </div>
        )}
        <Widget title={`Legal actions (${actions.length})`} bodyClass="p-0" flush
                actions={hints ? <span className="muted text-[12px]">{busy ? "solving…" : "value = best final HP after the action"}</span> : null}>
          <div className="step-list max-h-[420px] overflow-auto">
            {actions.map((a, i) => {
              const v = hints ? valueOf(outcomes[i]) : undefined;
              const cls = v === undefined ? "" : v == null ? "text-[var(--bad)]" : current != null && v < current ? "text-[var(--warn)]" : "text-[var(--ok)]";
              return (
                <button key={a.id} type="button" className="step w-full text-left" onClick={() => take(a)}>
                  <span className="n">{a.id}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{a.type === "fight" ? `Fight ${a.name} (${a.x},${a.y})` : a.type === "door" ? `Open ${a.door} door (${a.x},${a.y})` : a.type === "collect" ? `Collect ${a.name} (${a.x},${a.y})` : a.label}</span>
                    {a.type === "fight" && <span className={`text-[12px] ${a.canWin ? "muted" : "text-[var(--bad)]"}`}>
                      {a.damage! >= 999999999 ? "cannot hurt it" : `costs ${a.damage} HP${a.canWin ? ` → ${a.hpAfter}` : " — lethal"}`}</span>}
                  </span>
                  {hints && <span className={`mono text-[12px] w-20 text-right ${cls}`}>{v === undefined ? "…" : v == null ? "lost" : `→ ${v}`}</span>}
                </button>
              );
            })}
            {!actions.length && <p className="p-3 muted">No actions.</p>}
          </div>
        </Widget>
        <Widget title="Turns" bodyClass="p-0" flush>
          <div className="step-list max-h-[260px] overflow-auto">
            {history.map((e, i) => (
              <div key={i} className="step">
                <span className="n">{i === 0 ? "▶" : e.state.turn}</span>
                <span className="flex-1 truncate">{e.label}</span>
                {e.assisted && <span className="tag">assisted</span>}
                <span className="mono muted text-[12px] w-12 text-right">{e.hp}</span>
              </div>
            ))}
          </div>
        </Widget>
        <p className="muted text-[13px]">
          The engine assists as in the thesis: it collects items and fights monsters that cost 0 HP without asking. The exact
          solver ({" "}<Link className="link" href="/floors/">floors</Link>) computes the hints in your browser.
        </p>
      </div>
    </div>
  );
}
