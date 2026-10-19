"use client";
// State value after every turn of a single-floor episode: the best final HP still reachable (exact solver).
// Precomputed values are loaded from public/data/values; otherwise they are computed in the browser.
import { useEffect, useMemo, useState } from "react";
import type { EpisodeValues } from "@/lib/data-types";
import { parseFloor } from "@/lib/engine/floor";
import { startDifference } from "@/lib/engine/match";
import { GameState } from "@/lib/engine/state";
import { HEAVY } from "@/lib/floors";
import { stateText } from "@/lib/solver/solver";
import { stateValues } from "@/lib/solver/client";
import type { RunLog } from "@/lib/types";

export type TurnValue = { turn: number; value: number | null };
type Status = { kind: "idle" | "loading" | "computing" | "ready" | "unavailable" | "slow"; note?: string };

export function useEpisodeValues(id: string, floor: string | null, log: RunLog) {
  const [values, setValues] = useState<TurnValue[] | null>(null);
  const [status, setStatus] = useState<Status>({ kind: floor ? "loading" : "unavailable" });

  useEffect(() => {
    if (!floor) return;
    let live = true;
    (async () => {
      const pre = await fetch(`/data/values/${encodeURIComponent(id)}.json`).then((r) => (r.ok ? (r.json() as Promise<EpisodeValues>) : null)).catch(() => null);
      if (!live) return;
      if (pre) { setValues(pre.values); setStatus({ kind: "ready" }); return; }
      if (HEAVY.has(floor)) { setStatus({ kind: "slow" }); return; }
      const text = await fetch(`/data/floors/${floor}.txt`).then((r) => (r.ok ? r.text() : null));
      if (!live) return;
      if (!text) { setStatus({ kind: "unavailable", note: "floor file missing" }); return; }
      const def = parseFloor(floor, text);
      const start = log.turns.find((t) => t.type === "start");
      const diff = start ? startDifference(start, def) : "no start";
      if (diff) { setStatus({ kind: "unavailable", note: "played on an earlier version of this floor" }); return; }
      setStatus({ kind: "computing" });
      const s = new GameState(def);
      const states: (string | number | null)[] = [stateText(def.text, def.height, s.hero, s.removed)];
      const turns: number[] = [0];
      for (const ev of log.turns) {
        if (ev.type !== "turn") continue;
        const a = s.actions().find((x) => x.label === ev.action);
        if (!a) { setStatus({ kind: "unavailable", note: `turn ${ev.turn} does not replay` }); return; }
        s.apply(a);
        turns.push(ev.turn ?? turns.length);
        states.push(s.goalReached ? s.hero.hp : s.failed ? null : stateText(def.text, def.height, s.hero, s.removed));
      }
      const texts = states.filter((x): x is string => typeof x === "string");
      const solved = await stateValues(texts);
      if (!live) return;
      let k = 0;
      setValues(states.map((x, i) => ({ turn: turns[i], value: typeof x === "string" ? solved[k++] : x })));
      setStatus({ kind: "ready" });
    })().catch((e: unknown) => { if (live) setStatus({ kind: "unavailable", note: String(e) }); });
    return () => { live = false; };
  }, [id, floor, log]);

  return { values, status };
}

/** Value strip under the replay map: one column per turn, height = state value, red where the floor is lost. */
export function ValueStrip({ values, turnOf, idx, onSeek, status }: {
  values: TurnValue[] | null; turnOf: (snapIdx: number) => number; idx: number; onSeek: (snapIdx: number) => void; status: Status;
}) {
  const marks = useMemo(() => {
    if (!values?.length) return null;
    const opt = values[0].value;
    let firstDrop: TurnValue | null = null, lost: TurnValue | null = null;
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1].value, v = values[i].value;
      if (!firstDrop && prev != null && (v == null || v < prev)) firstDrop = values[i];
      if (!lost && prev != null && v == null) lost = values[i];
    }
    return { opt, firstDrop, lost, max: Math.max(1, ...values.map((v) => v.value ?? 0)) };
  }, [values]);

  if (status.kind === "slow") return (
    <div className="text-[13px] muted">
      No state values for this episode: on this floor the exact search takes minutes, so values are shown only for the episodes
      precomputed for the thesis figures.
    </div>
  );
  if (status.kind !== "ready" || !values || !marks) {
    return <div className="text-[13px] muted">{status.kind === "unavailable" ? `No state values: ${status.note ?? "not a single floor"}.` : "Computing state values with the exact solver…"}</div>;
  }
  const curTurn = turnOf(idx);
  const w = 100 / values.length;
  const byTurn = new Map(values.map((v, i) => [v.turn, i]));
  const seekTurn = (turn: number) => {
    for (let s = 0; s < 10000; s++) { if (turnOf(s) >= turn) { onSeek(s); return; } }
  };
  return (
    <div className="flex flex-col gap-1" data-testid="value-strip">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="muted">State value (best final HP still reachable):</span>
        <span className="mono">now <b>{(() => { const i = byTurn.get(curTurn); const v = i != null ? values[i].value : undefined; return v === undefined ? "–" : v == null ? "lost" : v; })()}</b></span>
        <span className="mono muted">optimum {marks.opt ?? "–"}</span>
        {marks.firstDrop && <button className="tag tag-warn" onClick={() => seekTurn(marks.firstDrop!.turn)} title="The first turn after which the best reachable HP is lower">first loss: turn {marks.firstDrop.turn}</button>}
        {marks.lost && <button className="tag tag-bad" onClick={() => seekTurn(marks.lost!.turn)} title="After this turn the boss can no longer be defeated">floor lost: turn {marks.lost.turn}</button>}
      </div>
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="w-full h-10 rounded" style={{ background: "var(--bg-2)" }} role="img"
           aria-label="state value per turn">
        {values.map((v, i) => {
          const hgt = v.value == null ? 24 : Math.max(1.5, (v.value / marks.max) * 22);
          const fill = v.value == null ? "var(--bad)" : marks.opt != null && v.value < marks.opt ? "var(--warn)" : "var(--ok)";
          return <rect key={i} x={i * w + w * 0.1} width={w * 0.8} y={24 - hgt} height={hgt} fill={fill} opacity={v.value == null ? 0.55 : 0.9}
                       onClick={() => seekTurn(v.turn)} style={{ cursor: "pointer" }}><title>{`turn ${v.turn}: ${v.value == null ? "floor lost" : `${v.value} HP reachable`}`}</title></rect>;
        })}
        {byTurn.has(curTurn) && <rect x={byTurn.get(curTurn)! * w} width={w} y={0} height={24} fill="none" stroke="var(--gold)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
  );
}
