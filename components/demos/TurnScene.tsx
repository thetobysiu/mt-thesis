"use client";
// One stored decision, shown where it can be talked through: the map before the move, the model's input, reasoning and
// answer, the move it led to, and the exact state value before and after. Controlled by its own buttons only (no URL,
// no window keys), so it can sit inside a slide or a paused walkthrough.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { FloorMap, useMapSkin } from "@/components/FloorMap";
import { Observation, Reasoning } from "@/components/RichText";
import { loadEpisode } from "@/lib/episode";
import { replay, type RunState } from "@/lib/run";
import type { TurnValue } from "@/components/ValueStrip";

type Tab = "observation" | "reasoning" | "answer";
type Loaded = { id: string; run: RunState; values: TurnValue[] | null };

const fmt = (v: number | null | undefined) => (v === undefined ? "–" : v == null ? "lost" : `${v} HP`);

export function TurnScene({ id, turn, tab: initialTab = "reasoning", note, values: showValues = true }: {
  id: string; turn: number; tab?: Tab; note?: ReactNode; values?: boolean;
}) {
  const [loaded, setLoaded] = useState<Loaded | { id: string; error: string } | null>(null);
  const [at, setAt] = useState(turn);
  const [moved, setMoved] = useState(false);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [skin] = useMapSkin();

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      loadEpisode(id, ac.signal),
      showValues ? fetch(`/data/values/${encodeURIComponent(id)}.json`, { signal: ac.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ values: TurnValue[] }>) : null)).catch(() => null) : Promise.resolve(null),
    ]).then(([log, vals]) => setLoaded({ id, run: replay(log.turns, log.result), values: vals?.values ?? null }))
      .catch((e: unknown) => { if (!ac.signal.aborted) setLoaded({ id, error: String(e) }); });
    return () => ac.abort();
  }, [id, showValues]);

  const run = loaded && "run" in loaded ? loaded.run : null;
  const decisions = useMemo(() => (run ? run.cards.filter((c) => c.kind === "turn" && !c.event.forced).map((c) => c.turn!) : []), [run]);
  const card = run?.cards.find((c) => c.kind === "turn" && c.turn === at) ?? null;
  const k = card?.snapIdx ?? 0;
  const before = run?.snapshots[k - 1] ?? run?.snapshots[0] ?? null;
  const after = run?.snapshots[k] ?? null;
  const shown = moved ? after : before;
  const map = shown?.floorId ? run?.maps[shown.floorId] : null;
  const vals = loaded && "values" in loaded ? loaded.values : null;
  const valueAt = (t: number | undefined) => (vals && t != null ? vals.find((v) => v.turn === t)?.value : undefined);
  const ev = card?.event;
  const chosen = ev?.corrected_from != null ? ev.corrected_from : typeof ev?.action_id === "number" ? ev.action_id : null;
  const idx = decisions.indexOf(at);
  const go = (t: number | undefined) => { if (t != null) { setAt(t); setMoved(false); } };
  const h = shown?.hero;

  if (loaded && "error" in loaded) return <div className="panel p-3 text-[var(--bad)]">Could not load the episode: {loaded.error}</div>;
  return (
    <div className="turn-scene grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-3 h-full min-h-0" data-demo data-testid="turn-scene">
      <div className="panel p-2 flex flex-col gap-2 min-h-0">
        <div className="flex flex-wrap items-center gap-2 text-[13px] mono">
          <b className="text-[var(--gold)]">Turn {at}</b>
          {h && <span className="muted">HP {h.hp} · ATK {h.atk} · DEF {h.def}{h.keys ? ` · keys ${h.keys.yellow}/${h.keys.blue}` : ""}</span>}
          <span className="ml-auto muted">{moved ? "after the move" : "as the model saw it"}</span>
        </div>
        <div className="flex-1 min-h-0">
          <FloorMap map={map} hero={shown?.hero} removed={shown?.removed} target={moved ? null : after?.target} path={moved ? null : after?.path}
                    fit minCell={12} maxCell={48} skin={skin} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-sm" onClick={() => go(decisions[idx - 1])} disabled={idx <= 0}>◀ previous decision</button>
          <button className="btn btn-sm btn-primary" onClick={() => setMoved((m) => !m)} disabled={!after}>{moved ? "back to the decision" : "show the move"}</button>
          <button className="btn btn-sm" onClick={() => go(decisions[idx + 1])} disabled={idx < 0 || idx >= decisions.length - 1}>next decision ▶</button>
        </div>
      </div>
      <div className="panel flex flex-col min-h-0">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--border-soft)]">
          <span className="text-[13px] min-w-0"><b>Chose:</b> {ev?.action ?? "…"}
            {ev?.corrected_from != null && <span className="tag tag-warn ml-1">override: {String(ev.corrected_from_label ?? "")}</span>}
          </span>
          <div className="tabs ml-auto" role="tablist" aria-label="decision text">
            {(["observation", "reasoning", "answer"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className="btn btn-sm" onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
        </div>
        {showValues && vals && (
          <div className="px-3 py-1 text-[13px] mono border-b border-[var(--border-soft)]">
            exact state value before {fmt(valueAt(before?.turn))} → after {fmt(valueAt(after?.turn))}
          </div>
        )}
        <div className="p-3 overflow-auto flex-1 min-h-0">
          {!card ? <p className="muted">{run ? `Turn ${at} is not a decision of this episode.` : "Loading the episode…"}</p>
            : tab === "observation" ? (card.observation ? <Observation text={card.observation} chosen={chosen} search={null} /> : <p className="muted">Not stored.</p>)
            : tab === "reasoning" ? (card.thinking ? <Reasoning text={card.thinking} search={null} /> : <p className="muted">Not stored.</p>)
            : (card.response ? <Reasoning text={card.response} search={null} /> : <p className="muted">Not stored.</p>)}
        </div>
        <div className="px-3 py-1.5 border-t border-[var(--border-soft)] text-[12px] flex flex-wrap gap-3">
          {note && <span className="muted">{note}</span>}
          <Link className="link ml-auto" href={`/episodes/${id}/?t=${at}`}>open in the full replay</Link>
        </div>
      </div>
    </div>
  );
}
