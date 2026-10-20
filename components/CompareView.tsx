"use client";
// Two episodes of the same floor side by side at the same turn. The first turn where they act differently is found
// and opened, with what each model saw and reasoned at that turn. URL: /compare/?a=<episode>&b=<episode>&t=<turn>.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloorMap, MapSkinSelect, useMapSkin } from "./FloorMap";
import { Outcome } from "./Outcome";
import { Observation, Reasoning } from "./RichText";
import { useEpisodeValues } from "./ValueStrip";
import { IconNext, IconPrev } from "./Icons";
import type { EpisodeEntry, EpisodeIndex } from "@/lib/data-types";
import { loadEpisode } from "@/lib/episode";
import { modelName, scenarioName } from "@/lib/format";
import { firstDifference, isReplayed, replay, type RunState, type TurnCard } from "@/lib/run";
import type { RunLog } from "@/lib/types";

export type ComparePreset = { a: string; b: string; title: string; note: string };
type Tab = "observation" | "reasoning" | "answer";
type Loaded = { id: string; log: RunLog; run: RunState } | { id: string; error: string };

function useEpisode(id: string | null): Loaded | null {
  const [state, setState] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    loadEpisode(id, ac.signal)
      .then((log) => setState({ id, log, run: replay(log.turns, log.result) }))
      .catch((e: unknown) => { if (!ac.signal.aborted) setState({ id, error: String(e) }); });
    return () => ac.abort();
  }, [id]);
  return state && state.id === id ? state : null;
}

function cardAt(run: RunState, idx: number): TurnCard | null {
  for (const c of run.cards) if (c.snapIdx === idx) return c;
  return null;
}

const kindOf = (c: TurnCard | null) => !c || c.kind !== "turn" ? null : isReplayed(c.event) ? "replayed" : c.event.forced ? "assisted" : "decision";
const episodeLabel = (e: EpisodeEntry) =>
  `${e.success ? "won" : e.died ? "died" : "not won"}${e.finalHp != null ? `, HP ${e.finalHp}` : ""} · ${e.turns} turns · ${e.started?.slice(0, 16).replace("T", " ") ?? e.id}`;

export function CompareView({ presets, valueFloors }: { presets: ComparePreset[]; valueFloors: string[] }) {
  const [episodes, setEpisodes] = useState<EpisodeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pair, setPair] = useState<{ a: string; b: string; t: number | null } | null>(null);
  const [cell, setCell] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/episodes.json").then((r) => r.json() as Promise<EpisodeIndex>).then((d) => {
      const single = d.episodes.filter((e) => !e.tower && e.mode !== "heuristic");
      const q = new URLSearchParams(window.location.search);
      const a = q.get("a"), b = q.get("b"), t = q.get("t");
      const known = (id: string | null) => !!id && single.some((e) => e.id === id);
      const p = known(a) && known(b) ? { a: a!, b: b!, t: t && /^\d+$/.test(t) ? Number(t) : null } : presets[0] ? { a: presets[0].a, b: presets[0].b, t: null } : null;
      setEpisodes(single);
      setPair(p);
      if (p) setCell(single.find((e) => e.id === p.a)?.cells[0]?.label ?? null);
    }).catch((e: unknown) => setError(String(e)));
  }, [presets]);

  const byId = useMemo(() => new Map((episodes ?? []).map((e) => [e.id, e])), [episodes]);
  const ea = pair ? byId.get(pair.a) ?? null : null;
  const eb = pair ? byId.get(pair.b) ?? null : null;
  const floor = ea?.floor ?? null;
  const cells = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of episodes ?? []) if (e.floor === floor) for (const c of e.cells) m.set(c.label, (m.get(c.label) ?? 0) + 1);
    return [...m].filter(([, n]) => n >= 2).map(([l]) => l).sort();
  }, [episodes, floor]);
  const inCell = useMemo(() => (episodes ?? []).filter((e) => e.floor === floor && (!cell || e.cells.some((c) => c.label === cell)))
    .sort((x, y) => (x.started ?? "").localeCompare(y.started ?? "")), [episodes, floor, cell]);

  const choose = (a: string, b: string, t: number | null = null) => {
    setPair({ a, b, t });
    const url = new URL(window.location.href);
    url.searchParams.set("a", a); url.searchParams.set("b", b);
    if (t == null) url.searchParams.delete("t"); else url.searchParams.set("t", String(t));
    window.history.replaceState(null, "", url);
  };
  const pickCell = (label: string) => {
    setCell(label);
    const eps = (episodes ?? []).filter((e) => e.floor === floor && e.cells.some((c) => c.label === label));
    const won = eps.find((e) => e.success), lost = eps.find((e) => !e.success);
    const a = won ?? eps[0], b = (lost && lost !== a ? lost : eps.find((e) => e !== a)) ?? eps[0];
    if (a && b) choose(a.id, b.id);
  };

  if (error) return <p className="text-[var(--bad)]">Could not load the episode list: {error}</p>;
  if (!episodes || !pair) return <p className="muted">Loading the episode list…</p>;
  return (
    <div className="flex flex-col gap-[var(--gap)]">
      {presets.length > 0 && (
        <div className="grid gap-[var(--gap)] sm:grid-cols-2 xl:grid-cols-4">
          {presets.map((p) => (
            <button key={`${p.a}-${p.b}`} className={`panel p-3 flex flex-col gap-1 text-left cursor-pointer hover:border-[var(--gold)] ${pair.a === p.a && pair.b === p.b ? "ring-2 ring-[var(--gold)]" : ""}`}
                    onClick={() => { setCell(byId.get(p.a)?.cells[0]?.label ?? null); choose(p.a, p.b); }}>
              <b className="text-[14px]">{p.title}</b>
              <span className="muted text-[13px]">{p.note}</span>
            </button>
          ))}
        </div>
      )}
      <div className="toolbar flex flex-wrap items-center gap-2">
        <span className="muted text-[13px]">{floor ? scenarioName(floor) : ""}</span>
        <select className="input max-w-[24rem]" value={cell ?? ""} onChange={(e) => pickCell(e.target.value)} aria-label="experiment cell">
          {!cell && <option value="">choose a cell</option>}
          {cells.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(["a", "b"] as const).map((side) => (
          <label key={side} className="flex items-center gap-1 text-[13px]">
            <span className="tag">{side.toUpperCase()}</span>
            <select className="input max-w-[22rem]" value={pair[side]} aria-label={`episode ${side.toUpperCase()}`}
                    onChange={(e) => side === "a" ? choose(e.target.value, pair.b) : choose(pair.a, e.target.value)}>
              {!inCell.some((e) => e.id === pair[side]) && byId.get(pair[side]) && <option value={pair[side]}>{episodeLabel(byId.get(pair[side])!)}</option>}
              {inCell.map((e) => <option key={e.id} value={e.id}>{episodeLabel(e)}</option>)}
            </select>
          </label>
        ))}
        <button className="btn btn-sm" onClick={() => choose(pair.b, pair.a)} title="swap A and B">swap</button>
      </div>
      {ea && eb && <Pair key={`${pair.a}|${pair.b}`} ea={ea} eb={eb} startTurn={pair.t} valueFloors={valueFloors} />}
    </div>
  );
}

function Pair({ ea, eb, startTurn, valueFloors }: { ea: EpisodeEntry; eb: EpisodeEntry; startTurn: number | null; valueFloors: string[] }) {
  const la = useEpisode(ea.id), lb = useEpisode(eb.id);
  if (!la || !lb) return <div className="panel p-6 muted">Loading both episode logs…</div>;
  if ("error" in la || "error" in lb) return <div className="panel p-4 text-[var(--bad)]">Could not load an episode: {"error" in la ? la.error : ""} {"error" in lb ? lb.error : ""}</div>;
  return <Loaded ea={ea} eb={eb} a={la} b={lb} startTurn={startTurn} valueFloor={valueFloors.includes(ea.floor) ? ea.floor : null} />;
}

function Loaded({ ea, eb, a, b, startTurn, valueFloor }: {
  ea: EpisodeEntry; eb: EpisodeEntry; a: { id: string; log: RunLog; run: RunState }; b: { id: string; log: RunLog; run: RunState };
  startTurn: number | null; valueFloor: string | null;
}) {
  const div = useMemo(() => firstDifference(a.run, b.run), [a.run, b.run]);
  const last = Math.max(a.run.snapshots.length, b.run.snapshots.length) - 1;
  const [idx, setIdx] = useState(() => {
    if (startTurn != null) { const i = a.run.snapshots.findIndex((s) => s.turn === startTurn && s.action !== "Start"); if (i >= 0) return i; }
    return div ?? Math.min(1, last);
  });
  const [tab, setTab] = useState<Tab>("reasoning");
  const [skin, setSkin] = useMapSkin();
  const va = useEpisodeValues(a.id, valueFloor, a.log);
  const vb = useEpisodeValues(b.id, valueFloor, b.log);
  const seek = (i: number) => {
    const n = Math.max(0, Math.min(last, i));
    setIdx(n);
    const url = new URL(window.location.href);
    const turn = (a.run.snapshots[n] ?? b.run.snapshots[n])?.turn;
    if (n === 0 || turn == null) url.searchParams.delete("t"); else url.searchParams.set("t", String(turn));
    window.history.replaceState(null, "", url);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA|SELECT/)) return;
    if (e.key === "ArrowLeft") { seek(idx - 1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { seek(idx + 1); e.preventDefault(); }
  };

  const valAt = (v: typeof va, i: number) => v.values?.[i]?.value;
  const fmtVal = (x: number | null | undefined) => x === undefined ? "–" : x == null ? "lost" : `${x} HP`;
  const sa = a.run.snapshots[div ?? 0], sb = b.run.snapshots[div ?? 0];
  const same = ea.id === eb.id;

  return (
    <div className="flex flex-col gap-[var(--gap)] outline-none" tabIndex={0} onKeyDown={onKey}>
      <div className="panel p-3 text-[14px] flex flex-col gap-1" data-testid="divergence">
        {same ? <span>A and B are the same episode.</span>
          : div == null ? <span>The two episodes take the same action at every turn.</span>
          : (
            <>
              <span>
                Same actions for the first <b>{div - 1}</b> turn{div - 1 === 1 ? "" : "s"}. They part at <b>turn {sa?.turn ?? sb?.turn}</b>:
                {" "}A <b>{sa?.action ?? "(ended)"}</b>{sa ? ` (${kindOf(cardAt(a.run, div)) ?? "–"})` : ""},
                {" "}B <b>{sb?.action ?? "(ended)"}</b>{sb ? ` (${kindOf(cardAt(b.run, div)) ?? "–"})` : ""}.
              </span>
              {valueFloor && va.values && vb.values && (
                <span className="muted text-[13px]">
                  Best final HP still reachable before that turn: {fmtVal(valAt(va, div - 1))}; after it: A {fmtVal(valAt(va, div))}, B {fmtVal(valAt(vb, div))}.
                </span>
              )}
              <button className="link text-left text-[13px] w-fit" onClick={() => seek(div)}>go to turn {sa?.turn ?? sb?.turn}</button>
            </>
          )}
      </div>

      <div className="toolbar flex flex-col gap-2">
        <input type="range" min={0} max={last} value={idx} onChange={(e) => seek(Number(e.target.value))} className="w-full" aria-label="turn" />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1" role="group" aria-label="turn controls">
            <button className="btn btn-sm" onClick={() => seek(idx - 1)} aria-label="previous turn" title="Previous turn (←)"><IconPrev /></button>
            <span className="mono text-[13px] w-24 text-center">{idx === 0 ? "start" : `turn ${(a.run.snapshots[idx] ?? b.run.snapshots[idx])?.turn}`}</span>
            <button className="btn btn-sm" onClick={() => seek(idx + 1)} aria-label="next turn" title="Next turn (→)"><IconNext /></button>
          </div>
          <div className="tabs" role="tablist" aria-label="decision text">
            {(["observation", "reasoning", "answer"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className="btn btn-sm" onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <span className="ml-auto"><MapSkinSelect skin={skin} setSkin={setSkin} /></span>
        </div>
      </div>

      <div className="grid gap-[var(--gap)] lg:grid-cols-2">
        <Side tag="A" e={ea} run={a.run} idx={idx} div={div} tab={tab} skin={skin} value={valueFloor ? fmtVal(valAt(va, idx)) : null} />
        <Side tag="B" e={eb} run={b.run} idx={idx} div={div} tab={tab} skin={skin} value={valueFloor ? fmtVal(valAt(vb, idx)) : null} />
      </div>
    </div>
  );
}

function Side({ tag, e, run, idx, div, tab, skin, value }: {
  tag: string; e: EpisodeEntry; run: RunState; idx: number; div: number | null; tab: Tab; skin: ReturnType<typeof useMapSkin>[0]; value: string | null;
}) {
  const lastIdx = run.snapshots.length - 1;
  const i = Math.min(idx, lastIdx);
  const snap = run.snapshots[i];
  const prev = i > 0 ? run.snapshots[i - 1] : null;
  const card = cardAt(run, i);
  const ev = card?.event;
  const hero = snap?.hero ?? run.hero;
  const dHp = prev?.hero && hero ? hero.hp - prev.hero.hp : 0;
  const ended = idx > lastIdx;
  const chosen = ev?.corrected_from != null ? ev.corrected_from : typeof ev?.action_id === "number" ? ev.action_id : null;
  const parted = div != null && i >= div;
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="panel flex flex-col min-w-0">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--border-soft)]">
        <span className="tag tag-info">{tag}</span>
        <b>{modelName(e.model)}</b>
        <Outcome e={e} />
        <Link className="link text-[13px] ml-auto" href={`/episodes/${e.id}/${snap && i > 0 ? `?t=${snap.turn}` : ""}`}>open episode</Link>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-3 py-2 text-[13px] mono">
        <span>HP <b>{hero?.hp ?? "–"}</b>{dHp ? <span className={dHp < 0 ? "text-[var(--bad)]" : "text-[var(--ok)]"}> {dHp > 0 ? "+" : ""}{dHp}</span> : null}</span>
        <span>ATK/DEF <b>{hero?.atk ?? "–"}/{hero?.def ?? "–"}</b></span>
        <span>keys <b>{hero?.keys ? `${hero.keys.yellow}/${hero.keys.blue}/${hero.keys.red}` : "–"}</b></span>
        <span title="best final HP still reachable (exact solver)">value <b>{value ?? "–"}</b></span>
      </div>
      <div className="h-[380px] px-3">
        <FloorMap map={snap?.floorId ? run.maps[snap.floorId] : null} hero={hero} stats={hero} removed={snap?.removed}
                  target={snap?.target ?? null} path={snap?.path ?? null} focus={focus} fit minCell={10} maxCell={48} skin={skin} />
      </div>
      <div className="px-3 py-2 text-[14px] border-t border-[var(--border-soft)]">
        {ended ? <span className="muted">This episode ended at turn {run.snapshots[lastIdx]?.turn}.</span>
          : i === 0 ? <span className="muted">Start of the floor.</span>
          : (
            <>
              <b className={parted && i === div ? "text-[var(--gold)]" : undefined}>{snap?.action}</b>{" "}
              <span className="tag">{kindOf(card) ?? "–"}</span>
              {ev?.corrected_from != null && <span className="tag tag-warn ml-1">override</span>}
            </>
          )}
      </div>
      <div className="px-3 pb-3 max-h-[440px] overflow-auto">
        {ended || i === 0 ? null
          : !card || card.kind !== "turn" ? <p className="muted text-[13px]">No decision at this step.</p>
          : ev?.forced ? <p className="muted text-[13px]">The engine acted without asking the model{ev.forced_reason ? ` (${ev.forced_reason})` : ""}.</p>
          : tab === "observation" ? (card.observation ? <Observation text={card.observation} chosen={chosen} search={null} onCoord={setFocus} /> : <p className="muted text-[13px]">No observation stored.</p>)
          : tab === "reasoning" ? (card.thinking ? <Reasoning text={card.thinking} search={null} onCoord={setFocus} /> : <p className="muted text-[13px]">No reasoning stored for this turn.</p>)
          : (card.response ? <Reasoning text={card.response} search={null} onCoord={setFocus} /> : <p className="muted text-[13px]">No answer text stored.</p>)}
      </div>
    </div>
  );
}
