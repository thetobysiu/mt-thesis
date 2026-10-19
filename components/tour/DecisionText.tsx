"use client";
// The observation, reasoning and answer of one stored decision, loaded from the episode log.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Observation, Reasoning } from "@/components/RichText";
import { loadEpisode } from "@/lib/episode";
import { replay } from "@/lib/run";
import type { RunLog } from "@/lib/types";

type Tab = "observation" | "reasoning" | "answer";

export function DecisionText({ id, turn, initialTab = "observation", height = 520 }: { id: string; turn: number; initialTab?: Tab; height?: number }) {
  const [state, setState] = useState<{ id: string; log: RunLog } | { id: string; error: string } | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    const ac = new AbortController();
    loadEpisode(id, ac.signal).then((log) => setState({ id, log })).catch((e: unknown) => { if (!ac.signal.aborted) setState({ id, error: String(e) }); });
    return () => ac.abort();
  }, [id]);
  const card = useMemo(() => {
    if (!state || "error" in state) return null;
    const run = replay(state.log.turns, state.log.result);
    return run.cards.find((c) => c.kind === "turn" && c.turn === turn) ?? null;
  }, [state, turn]);

  if (state && "error" in state) return <div className="panel p-3 text-[var(--bad)]">Could not load the episode: {state.error}</div>;
  const ev = card?.event;
  const chosen = ev?.corrected_from != null ? ev.corrected_from : typeof ev?.action_id === "number" ? ev.action_id : null;
  return (
    <div className="panel flex flex-col min-w-0">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--border-soft)]">
        <b className="text-[14px]">Turn {turn}{ev?.action ? `: ${ev.action}` : ""}</b>
        <div className="tabs ml-auto" role="tablist" aria-label="decision text">
          {(["observation", "reasoning", "answer"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className="btn btn-sm" onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="p-3 overflow-auto" style={{ maxHeight: height }}>
        {!card ? <p className="muted">Loading the episode log…</p>
          : tab === "observation" ? (card.observation ? <Observation text={card.observation} chosen={chosen} search={null} /> : <p className="muted">Not stored.</p>)
          : tab === "reasoning" ? (card.thinking ? <Reasoning text={card.thinking} search={null} /> : <p className="muted">Not stored.</p>)
          : (card.response ? <Reasoning text={card.response} search={null} /> : <p className="muted">Not stored.</p>)}
      </div>
      <div className="px-3 py-2 border-t border-[var(--border-soft)] text-[13px]">
        <Link className="link" href={`/episodes/${id}/?t=${turn}`}>open this turn in the full replay</Link>
      </div>
    </div>
  );
}
