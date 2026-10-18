import type { EpisodeEntry } from "@/lib/data-types";

/** Outcome of an episode or run as a tag: success, died, failed alive, highest floor for the tower. */
export function Outcome({ e }: { e: Pick<EpisodeEntry, "success" | "died" | "finalHp" | "tower" | "maxFloor" | "hasResult"> }) {
  if (e.tower) {
    return <span className={`tag ${e.died ? "tag-bad" : "tag-info"}`} title="Tower runs are reported by the highest floor reached">
      {e.maxFloor ? `highest floor ${e.maxFloor}` : "tower run"}{e.died ? " · died" : ""}
    </span>;
  }
  if (!e.hasResult) return <span className="tag">incomplete</span>;
  if (e.success) return <span className="tag tag-ok">won · {e.finalHp} HP</span>;
  if (e.died) return <span className="tag tag-bad">died</span>;
  return <span className="tag tag-warn" title="Alive, boss not defeated">not won</span>;
}

export function Rate({ successes, n, ci }: { successes: number | null; n: number; ci: [number, number] | null }) {
  if (successes == null) return <span className="muted">–</span>;
  return (
    <span className="mono" title={ci ? `Wilson 95 % interval ${ci[0].toFixed(2)}–${ci[1].toFixed(2)}` : undefined}>
      {successes}/{n}{ci ? <span className="muted"> [{ci[0].toFixed(2)}, {ci[1].toFixed(2)}]</span> : null}
    </span>
  );
}
