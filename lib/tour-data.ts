// Build-time helpers for the tour: episodes and turns picked from the stored logs, so the tour points at real decisions.
import { cellEpisodes, getCell, readEpisodeLog, readEpisodeValues } from "./data";
import { firstDifference, replay } from "./run";
import type { RunEvent } from "./types";

export const replayHref = (id: string, turn?: number) => `/episodes/${id}/${turn != null ? `?t=${turn}` : ""}`;

/** First episode of a cell whose given turn is a model decision taken from the given position (optional). */
export function findDecision(cell: string, turn: number, at?: { x: number; y: number }): { id: string; event: RunEvent } | null {
  for (const e of cellEpisodes(cell)) {
    const turns = readEpisodeLog(e.id).turns.filter((t) => t.type === "turn");
    const ev = turns.find((t) => t.turn === turn);
    const before = turns.find((t) => t.turn === turn - 1);
    if (!ev || ev.forced) continue;
    if (at && (before?.hero?.x !== at.x || before?.hero?.y !== at.y)) continue;
    return { id: e.id, event: ev };
  }
  return null;
}

export type OverrideTurn = { id: string; turn: number; chose: string; executed: string; reason: string | null; won: boolean };

/** Every logged override in the episodes of a cell. */
export function cellOverrides(cell: string): OverrideTurn[] {
  const out: OverrideTurn[] = [];
  for (const e of cellEpisodes(cell)) {
    for (const t of readEpisodeLog(e.id).turns) {
      if (t.type !== "turn" || t.corrected_from == null) continue;
      out.push({ id: e.id, turn: t.turn ?? 0, chose: String(t.corrected_from_label ?? `action ${t.corrected_from}`), executed: String(t.action ?? ""),
                 reason: typeof t.corrected_reason === "string" ? t.corrected_reason : null, won: e.success === true });
    }
  }
  return out;
}

export type Divergence = {
  a: string; b: string; turn: number; actionA: string; actionB: string;
  before: number | null | undefined; afterA: number | null | undefined; afterB: number | null | undefined;
};

/** A won and a lost episode of the same cell and the first turn at which they act differently. */
export function winLossDivergence(cell: string): Divergence | null {
  const eps = cellEpisodes(cell);
  const won = eps.find((e) => e.success), lost = eps.find((e) => !e.success);
  if (!won || !lost || !getCell(cell)) return null;
  const la = readEpisodeLog(won.id), lb = readEpisodeLog(lost.id);
  const ra = replay(la.turns, la.result), rb = replay(lb.turns, lb.result);
  const i = firstDifference(ra, rb);
  if (i == null) return null;
  const va = readEpisodeValues(won.id)?.values, vb = readEpisodeValues(lost.id)?.values;
  return {
    a: won.id, b: lost.id, turn: ra.snapshots[i]?.turn ?? rb.snapshots[i]?.turn ?? i,
    actionA: ra.snapshots[i]?.action ?? "(ended)", actionB: rb.snapshots[i]?.action ?? "(ended)",
    before: va?.[i - 1]?.value, afterA: va?.[i]?.value, afterB: vb?.[i]?.value,
  };
}
