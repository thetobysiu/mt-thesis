import type { Metadata } from "next";
import Link from "next/link";
import { FloorThumb } from "@/components/FloorThumb";
import { getFloors, getFloorText } from "@/lib/data";
import { floorRank, floorTitle } from "@/lib/floors";

export const metadata: Metadata = { title: "Play" };

export default function PlayPage() {
  const floors = [...getFloors()].sort((a, b) => floorRank(a.id) - floorRank(b.id));
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Play</span>
        <h1>Play a floor</h1>
        <p className="lead">
          The single floors run on the thesis engine, ported to TypeScript and checked against every stored episode. Turn on the solver
          hints to see, for every action, the best final HP still reachable after it: the same state values the thesis uses to find the
          decision that lost an episode.
        </p>
      </section>
      <div className="card-grid">
        {floors.map((f) => (
          <Link key={f.id} href={`/play/${f.id}/`} className="card-link">
            <div className="flex items-center gap-3">
              <FloorThumb id={f.id} text={getFloorText(f.id)} cell={f.width > 11 ? 8 : 10} />
              <div className="flex flex-col gap-1">
                <span className="heading text-[16px]">{floorTitle(f.id)}</span>
                <span className="mono text-[13px]">optimum <b className="text-[var(--gold)]">{f.exact.hp} HP</b></span>
                <span className="go">play</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
