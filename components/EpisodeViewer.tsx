"use client";
// Replay of one stored episode: the map with playback on the left, the decision at the current turn on the right
// (what the engine showed, what the model reasoned, what it answered). Keyboard: ←/→ step, Home/End, Space play.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FloorMap, MapLegend, MapSkinSelect, useMapSkin } from "./FloorMap";
import { Observation, Reasoning, searchRegex } from "./RichText";
import { Widget, Stat } from "./Widget";
import { IconNext, IconPause, IconPlay, IconPrev, IconSkipEnd, IconSkipStart } from "./Icons";
import { loadEpisode } from "@/lib/episode";
import { isReplayed, replay, type RunState, type TurnCard } from "@/lib/run";
import type { RunLog } from "@/lib/types";

type Tab = "observation" | "reasoning" | "answer";

function readTurnParam(): number | null {
  const t = new URLSearchParams(window.location.search).get("t");
  return t != null && /^\d+$/.test(t) ? Number(t) : null;
}

export function EpisodeViewer({ id }: { id: string }) {
  const [log, setLog] = useState<RunLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    loadEpisode(id, ac.signal).then(setLog).catch((e: unknown) => { if (!ac.signal.aborted) setError(String(e)); });
    return () => ac.abort();
  }, [id]);
  const run = useMemo(() => (log ? replay(log.turns, log.result) : null), [log]);
  if (error) return <div className="panel p-4 text-[var(--bad)]">Could not load this episode: {error}</div>;
  if (!run || !log) return <div className="panel p-6 muted" data-testid="viewer-loading">Loading the episode log…</div>;
  return <Viewer run={run} log={log} />;
}

function Viewer({ run, log }: { run: RunState; log: RunLog }) {
  const last = run.snapshots.length - 1;
  const [idx, setIdx] = useState(() => {
    const t = typeof window === "undefined" ? null : readTurnParam();
    if (t == null) return Math.min(1, last);
    const i = run.snapshots.findIndex((s) => s.turn === t && s.action !== "Start");
    return i >= 0 ? i : Math.min(1, last);
  });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [tab, setTab] = useState<Tab>("observation");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);
  const [skin, setSkin] = useMapSkin();
  const [enemyMetric, setEnemyMetric] = useState<"dmg" | "hp">("dmg");
  const [pinnedFloor, setPinnedFloor] = useState<string | null>(null);
  const [mapWhen, setMapWhen] = useState<"after" | "before">("after");
  const listRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const snap = run.snapshots[idx] ?? null;
  const prev = idx > 0 ? run.snapshots[idx - 1] : null;
  const cardBySnap = useMemo(() => {
    const m = new Map<number, TurnCard>();
    for (const c of run.cards) if (c.snapIdx != null) m.set(c.snapIdx, c);
    return m;
  }, [run.cards]);
  const card = cardBySnap.get(idx) ?? null;
  const notes = useMemo(() => run.cards.filter((c) => (c.kind === "parse_error" || c.kind === "stuck" || c.kind === "loop_guard" || c.kind === "stopped")
                                                  && c.turn != null && c.turn === snap?.turn), [run.cards, snap?.turn]);

  // URL ?t=<turn> follows the replay position so a turn can be linked to
  useEffect(() => {
    if (!snap) return;
    const url = new URL(window.location.href);
    if (idx === 0) url.searchParams.delete("t"); else url.searchParams.set("t", String(snap.turn));
    window.history.replaceState(null, "", url);
  }, [idx, snap]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => { if (i >= last) { setPlaying(false); return i; } return i + 1; }), 1000 / speed);
    return () => clearInterval(t);
  }, [playing, speed, last]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-snap="${idx}"]`);
    const sc = listRef.current;
    if (el && sc) sc.scrollTop = el.offsetTop - sc.offsetTop - sc.clientHeight / 3;
  }, [idx]);
  // the observation opens at the action the model chose
  useEffect(() => {
    const sc = textRef.current?.closest<HTMLElement>(".body");
    const el = textRef.current?.querySelector<HTMLElement>(".ln-chosen");
    if (!sc) return;
    sc.scrollTop = el ? el.offsetTop - sc.offsetTop - 80 : 0;
  }, [idx, tab]);

  const seek = useCallback((i: number) => { setPlaying(false); setPinnedFloor(null); setIdx(Math.max(0, Math.min(last, i))); }, [last]);
  const decisionIdx = useMemo(() => run.cards.filter((c) => c.kind === "turn" && !c.event.forced && c.snapIdx != null).map((c) => c.snapIdx!), [run.cards]);
  const jumpDecision = (dir: 1 | -1) => {
    const next = dir > 0 ? decisionIdx.find((i) => i > idx) : [...decisionIdx].reverse().find((i) => i < idx);
    if (next != null) seek(next);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
    if (e.key === "ArrowLeft" && e.shiftKey) { jumpDecision(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight" && e.shiftKey) { jumpDecision(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { seek(idx - 1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { seek(idx + 1); e.preventDefault(); }
    else if (e.key === "Home") { seek(0); e.preventDefault(); }
    else if (e.key === "End") { seek(last); e.preventDefault(); }
    else if (e.key === " ") { setPlaying((v) => !v); e.preventDefault(); }
  };

  const search = useMemo(() => searchRegex(query), [query]);
  const hits = useMemo(() => {
    if (!search) return [] as number[];
    const re = new RegExp(search.source, "i");
    const out: number[] = [];
    for (const c of run.cards) {
      if (c.snapIdx == null) continue;
      if (re.test(`${c.observation ?? ""}\n${c.thinking ?? ""}\n${c.response ?? ""}`)) out.push(c.snapIdx);
    }
    return out;
  }, [search, run.cards]);
  const jump = (dir: 1 | -1) => {
    if (!hits.length) return;
    const next = dir > 0 ? hits.find((h) => h > idx) ?? hits[0] : [...hits].reverse().find((h) => h < idx) ?? hits[hits.length - 1];
    seek(next);
  };

  const heroFloor = snap?.floorId ?? run.currentFloor;
  const viewFloor = pinnedFloor ?? heroFloor;
  const onHeroFloor = viewFloor === heroFloor;
  // "before" shows the map as the model saw it when it chose this turn's action
  const shown = mapWhen === "before" && prev && prev.floorId === snap?.floorId ? prev : snap;
  const removed = useMemo(() => {
    if (onHeroFloor) return shown?.removed;
    for (let i = idx; i >= 0; i--) if (run.snapshots[i].floorId === viewFloor) return run.snapshots[i].removed;
    return new Set<string>();
  }, [onHeroFloor, shown, idx, run.snapshots, viewFloor]);
  const hero = snap?.hero ?? run.hero;
  const mapHero = shown?.hero ?? hero;
  const hp = hero?.hp ?? 0;
  const dHp = prev?.hero && hero ? hero.hp - prev.hero.hp : 0;
  const ev = card?.event;
  const chosen = typeof ev?.action_id === "number" ? ev.action_id : null;
  const modelChoice = ev?.corrected_from != null ? ev.corrected_from : chosen;

  return (
    <div className="viewer outline-none" tabIndex={0} onKeyDown={onKey} data-testid="episode-viewer">
      <div className="map-area flex flex-col gap-[var(--gap)] min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--gap)] shrink-0">
          <Stat label="HP" value={hp} sub={`${dHp ? `${dHp > 0 ? "+" : ""}${dHp} this turn · ` : ""}start ${run.initialHp}`}
                tone={hp <= 0 ? "bad" : hp < run.initialHp * 0.2 ? "warn" : undefined} />
          <Stat label="ATK / DEF" value={`${hero?.atk ?? "–"} / ${hero?.def ?? "–"}`} sub={`position (${hero?.x ?? "–"},${hero?.y ?? "–"})`} />
          <Stat label="Keys" value={hero?.keys ? `${hero.keys.yellow} / ${hero.keys.blue} / ${hero.keys.red}` : "–"} sub="yellow / blue / red" />
          <Stat label="Turn" value={`${snap?.turn ?? 0} / ${run.snapshots[last]?.turn ?? 0}`}
                sub={`${run.decisions} decisions · ${run.assisted} assisted${run.replayed ? ` · ${run.replayed} replayed` : ""}${run.overrides ? ` · ${run.overrides} overridden` : ""}`} />
        </div>
        <Widget title={`Map · ${viewFloor ?? ""}`} className="flex-1 min-h-0"
                bodyClass="flex-1 min-h-0 flex flex-col gap-2"
                badge={run.floorsVisited.length > 1 ? (
                  <select className="input" value={viewFloor ?? ""} aria-label="floor to show"
                          onChange={(e) => setPinnedFloor(e.target.value === heroFloor ? null : e.target.value)}>
                    {run.floorsVisited.map((f) => <option key={f} value={f}>{f}{f === heroFloor ? " (hero)" : ""}</option>)}
                  </select>
                ) : null}
                actions={<>
                  <select className="input" value={mapWhen} onChange={(e) => setMapWhen(e.target.value as "after" | "before")} aria-label="map moment">
                    <option value="after">map: after the turn</option>
                    <option value="before">map: before (as the model saw it)</option>
                  </select>
                  <select className="input" value={enemyMetric} onChange={(e) => setEnemyMetric(e.target.value as "dmg" | "hp")} aria-label="number on monsters">
                    <option value="dmg">monsters: HP cost</option>
                    <option value="hp">monsters: their HP</option>
                  </select>
                  <MapSkinSelect skin={skin} setSkin={setSkin} />
                </>}>
          <div className="flex-1 min-h-[280px]">
            <FloorMap map={viewFloor ? run.maps[viewFloor] : null} hero={onHeroFloor ? mapHero : null} stats={mapHero} removed={removed}
                      target={onHeroFloor ? snap?.target ?? null : null} path={onHeroFloor ? snap?.path ?? null : null}
                      focus={focus} fit minCell={12} maxCell={64} enemyMetric={enemyMetric} skin={skin} />
          </div>
          <div className="flex flex-wrap items-center gap-1 shrink-0" data-testid="transport">
            <button className="btn btn-sm" onClick={() => seek(0)} title="Start (Home)" aria-label="start"><IconSkipStart /></button>
            <button className="btn btn-sm" onClick={() => seek(idx - 1)} title="Previous turn (←)" aria-label="previous turn"><IconPrev /></button>
            <button className="btn btn-sm btn-primary" onClick={() => setPlaying((v) => !v)} title="Play (Space)" aria-label={playing ? "pause" : "play"}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button className="btn btn-sm" onClick={() => seek(idx + 1)} title="Next turn (→)" aria-label="next turn"><IconNext /></button>
            <button className="btn btn-sm" onClick={() => seek(last)} title="End (End)" aria-label="end"><IconSkipEnd /></button>
            <span className="w-2" />
            <button className="btn btn-sm" onClick={() => jumpDecision(-1)} title="Previous model decision (Shift+←)">← decision</button>
            <button className="btn btn-sm" onClick={() => jumpDecision(1)} title="Next model decision (Shift+→)">decision →</button>
            <input type="range" min={0} max={last} value={idx} onChange={(e) => seek(Number(e.target.value))} className="flex-1 min-w-[140px] mx-2" aria-label="turn" />
            <select className="input" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="replay speed">
              {[1, 2, 4, 8].map((s) => <option key={s} value={s}>{s} turn/s</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <MapLegend enemyMetric={enemyMetric} skin={skin} />
            <span className="muted text-[12px] ml-auto">← → turn · Shift+← → decision · Space play · hover a coordinate in the text to find it on the map</span>
          </div>
        </Widget>
      </div>

      <div className="turn-panel flex flex-col gap-[var(--gap)] min-h-0">
        <Widget title={idx === 0 ? "Start" : `Turn ${snap?.turn}`} className="flex-1 min-h-0" bodyClass="flex-1 min-h-0 overflow-auto" flush
                badge={idx === 0 ? null : <TurnTags card={card} />}
                actions={<div className="tabs" role="tablist" aria-label="decision text">
                  {(["observation", "reasoning", "answer"] as Tab[]).map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} className="btn btn-sm" onClick={() => setTab(t)}>{t}</button>
                  ))}
                </div>}>
          <div className="p-3 flex flex-col gap-2" ref={textRef}>
            {idx > 0 && (
              <div className="text-[15px]" data-testid="executed">
                <b>{snap?.action}</b>
                {dHp !== 0 && <span className={dHp < 0 ? "text-[var(--bad)]" : "text-[var(--ok)]"}> {dHp > 0 ? "+" : ""}{dHp} HP</span>}
                {ev?.corrected_from != null && (
                  <div className="muted text-[13px]">The model chose action {ev.corrected_from}{ev.corrected_from_label ? ` (${ev.corrected_from_label})` : ""}; the engine replaced it ({ev.corrected_reason ?? "mechanical override"}).</div>
                )}
                {ev && isReplayed(ev) ? <div className="muted text-[13px]">Replayed: the stored run&apos;s own turn, repeated up to the point where this run was resumed ({ev.forced_reason}).</div>
                  : ev?.forced && <div className="muted text-[13px]">Assisted turn: the engine acted without asking the model{ev.forced_reason ? ` (${ev.forced_reason})` : ""}.</div>}
                {card?.planNote && <div className="text-[13px] text-[var(--info)]">plan memory: {card.planNote}</div>}
              </div>
            )}
            {notes.map((n) => (
              <div key={n.key} className="text-[13px] text-[var(--warn)]">{n.kind.replace("_", " ")}: {String(n.event.reason ?? n.event.message ?? "")}
                {n.event.repaired_id != null ? ` → repaired to action ${n.event.repaired_id}` : ""}</div>
            ))}
            <TurnText tab={tab} card={card} idx={idx} log={log} run={run} chosen={modelChoice} search={search} onCoord={setFocus} />
          </div>
        </Widget>
        <Widget title="Search the decisions" className="shrink-0"
                actions={search ? <span className="mono text-[12px]">{hits.length} turn{hits.length === 1 ? "" : "s"}</span> : null}>
          <div className="flex items-center gap-2">
            <input className="input flex-1" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. ORDER, key, Slime Lord, (7,5)"
                   aria-label="search observations and reasoning" />
            <button className="btn btn-sm" onClick={() => jump(-1)} disabled={!hits.length} aria-label="previous match">prev</button>
            <button className="btn btn-sm" onClick={() => jump(1)} disabled={!hits.length} aria-label="next match">next</button>
          </div>
        </Widget>
        <Widget title="All turns" className="shrink-0" bodyClass="p-0" flush>
          <div ref={listRef} className="step-list max-h-[26vh] overflow-auto" data-testid="step-list">
            {run.snapshots.map((s, i) => {
              const c = cardBySnap.get(i);
              const e = c?.event;
              return (
                <button type="button" key={i} data-snap={i} className={`step w-full text-left ${i === idx ? "active" : ""}`} onClick={() => seek(i)}
                        aria-current={i === idx ? "step" : undefined}>
                  <span className="n">{i === 0 ? "▶" : s.turn}</span>
                  <span className="flex-1 truncate">{s.action}</span>
                  {e?.corrected_from != null && <span className="tag tag-warn">override</span>}
                  {c?.kind === "turn" && (e && isReplayed(e) ? <span className="tag">replayed</span> : e?.forced ? <span className="tag">assisted</span> : <span className="tag tag-info">decision</span>)}
                  {hits.includes(i) && <span className="tag tag-warn">match</span>}
                  <span className="mono muted text-[12px] w-12 text-right">{s.hero?.hp ?? ""}</span>
                </button>
              );
            })}
          </div>
        </Widget>
      </div>
    </div>
  );
}

function TurnTags({ card }: { card: TurnCard | null }) {
  const ev = card?.event;
  if (!card) return null;
  if (card.kind === "floor_change") return <span className="tag tag-info">floor change</span>;
  return (
    <>
      {ev && isReplayed(ev) ? <span className="tag" title="The stored run's own turn, repeated up to the resume point">replayed turn</span>
        : ev?.forced ? <span className="tag" title="The engine acted without asking the model (an assist)">assisted turn</span>
        : <span className="tag tag-info" title="The model was asked to choose">model decision</span>}
      {ev?.corrected_from != null && <span className="tag tag-warn" title="The engine replaced the model's choice">mechanical override</span>}
      {ev?.elapsed_ms != null && <span className="muted">{(ev.elapsed_ms / 1000).toFixed(0)} s</span>}
    </>
  );
}

function TurnText({ tab, card, idx, log, run, chosen, search, onCoord }: {
  tab: Tab; card: TurnCard | null; idx: number; log: RunLog; run: RunState; chosen: number | null;
  search: RegExp | null; onCoord: (c: { x: number; y: number } | null) => void;
}) {
  if (idx === 0) {
    const sys = run.meta.systemPrompt ?? log.runtime_prompt ?? log.prompt ?? "";
    return (
      <div className="flex flex-col gap-2">
        <p className="muted text-[12px]">The system prompt the model received with every decision (rules and the floor map). Step forward to see the decisions.</p>
        {sys ? <Reasoning text={sys} search={search} onCoord={onCoord} /> : <p className="muted">No system prompt is stored for this episode (rule-based heuristic).</p>}
      </div>
    );
  }
  if (!card || card.kind !== "turn") return <p className="muted">No decision at this step.</p>;
  if (card.event.forced) return <p className="muted text-[12px]">The model was not asked at this turn, so there is no observation or reasoning.</p>;
  if (tab === "observation") {
    return card.observation
      ? <Observation text={card.observation} chosen={chosen} search={search} onCoord={onCoord} />
      : <p className="muted">The observation was not stored for this turn.</p>;
  }
  if (tab === "reasoning") {
    return card.thinking
      ? <Reasoning text={card.thinking} search={search} onCoord={onCoord} />
      : <p className="muted">No reasoning was stored for this turn (the model answered without a reasoning trace, or the trace was not logged).</p>;
  }
  return card.response
    ? <Reasoning text={card.response} search={search} onCoord={onCoord} />
    : <p className="muted">No answer text was stored for this turn.</p>;
}
