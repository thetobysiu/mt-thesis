import type { Metadata } from "next";
import Link from "next/link";
import { FloorThumb } from "@/components/FloorThumb";
import { getEpisodes, getFloors, getFloorText } from "@/lib/data";
import { floorBlurb, floorRank, floorTitle } from "@/lib/floors";

export const metadata: Metadata = { title: "Floors" };

export default function FloorsPage() {
  const floors = [...getFloors()].sort((a, b) => floorRank(a.id) - floorRank(b.id));
  const eps = getEpisodes().episodes;
  const stats = (id: string) => {
    const on = eps.filter((e) => e.floor === id && e.model);
    return { n: on.length, wins: on.filter((e) => e.success).length };
  };
  const groups: [string, string, typeof floors][] = [
    ["Floors of the main results", "The simple floor, the four hand-designed floors and the complex floor (Table 6.2).", floors.filter((f) => f.kind !== "gen")],
    ["Generated floors", "Fifteen generated boss floors (Table 6.12): gen01 and gen02 train the prompt optimisation, gen03 to gen15 are held out.", floors.filter((f) => f.kind === "gen")],
  ];
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Explore</span>
        <h1>Floors</h1>
        <p className="lead">
          The 21 single floors of the thesis. Each has an exact optimum, computed by the exact solver: the most HP the hero can still have
          when the boss falls. Open a floor for its optimal route, the episodes the models won on it, and to play it yourself.
        </p>
      </section>
      {groups.map(([title, text, list]) => (
        <section key={title} className="flex flex-col gap-3">
          <h2>{title}</h2>
          <p className="muted">{text}</p>
          <div className="card-grid">
            {list.map((f) => {
              const s = stats(f.id);
              return (
                <Link key={f.id} href={`/floors/${f.id}/`} className="card-link">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0"><FloorThumb id={f.id} text={getFloorText(f.id)} cell={f.width > 11 ? 9 : 11} /></div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="heading text-[16px]">{floorTitle(f.id)}</span>
                      <span className="mono text-[13px]">optimum <b className="text-[var(--gold)]">{f.exact.hp} HP</b></span>
                      {f.published.hp !== f.exact.hp && <span className="mono text-[13px] muted">published solver {f.published.hp} HP</span>}
                      <span className="text-[13px] muted">{s.n ? `${s.wins} of ${s.n} model episodes won` : "no model episodes"}</span>
                    </div>
                  </div>
                  <span className="muted text-[13px]">{floorBlurb(f)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
