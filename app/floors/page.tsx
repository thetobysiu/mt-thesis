import type { Metadata } from "next";
import Link from "next/link";
import { FloorGroup } from "@/components/FloorGroup";
import { FloorThumb } from "@/components/FloorThumb";
import { TowerThumb } from "@/components/TowerMap";
import { getEpisodes, getFloors, getFloorText, getTowerFloors } from "@/lib/data";
import type { FloorEntry } from "@/lib/data-types";
import { floorBlurb, floorRank, floorTitle, TOWER_NOTES, towerFloorTitle } from "@/lib/floors";

export const metadata: Metadata = { title: "Floors" };

export default function FloorsPage() {
  const floors = [...getFloors()].sort((a, b) => floorRank(a.id) - floorRank(b.id));
  const eps = getEpisodes().episodes;
  const stats = (id: string) => {
    const on = eps.filter((e) => e.floor === id && e.model);
    return { n: on.length, wins: on.filter((e) => e.success).length };
  };
  const tower = getTowerFloors();
  const reached = (id: string) => tower.runs.filter((r) => r.arrivals[id]).length;
  const tilesOf = (grid: number[][]) => Object.fromEntries([...new Set(grid.flat())].map((n) => [n, tower.tiles[n]]));

  const card = (f: FloorEntry) => {
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
  };
  const testMaps = floors.filter((f) => f.kind === "simple" || f.kind === "complex");
  const hand = floors.filter((f) => f.kind === "hand");
  const gen = floors.filter((f) => f.kind === "gen");

  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Explore</span>
        <h1>Floors</h1>
        <p className="lead">
          The {floors.length} single floors of the thesis and the {tower.floors.length} maps of the tower. Each single floor has an exact optimum,
          computed by the exact solver: the most HP the hero can still have when the boss falls. Open a floor for its optimal route, the
          episodes the models won on it, and to play it yourself; open a tower floor for its monsters and the tower runs that reached it.
        </p>
      </section>

      <FloorGroup id="test-maps" title="Simple and complex floor" summary={`${testMaps.length} floors · Table 6.2`} defaultOpen
                  text="The two boss floors from the published solver's test maps: the simple floor is the running example, the complex floor the long one.">
        <div className="card-grid">{testMaps.map(card)}</div>
      </FloorGroup>

      <FloorGroup id="hand" title="Hand-designed floors" summary={`${hand.length} floors · Tables 6.2 and 6.11`} defaultOpen
                  text="Designed for the thesis so that exactly one set of monsters and doors wins; the rule-based heuristic and random play fail on all four.">
        <div className="card-grid">{hand.map(card)}</div>
      </FloorGroup>

      <FloorGroup id="generated" title="Generated floors" summary={`${gen.length} floors · Table 6.12`}
                  text="Generated boss floors, each checked by the exact solver: gen01 and gen02 train the prompt optimisation, gen03 to gen15 are held out.">
        <div className="card-grid">{gen.map(card)}</div>
      </FloorGroup>

      <FloorGroup id="tower" title="Tower floors" summary={`${tower.floors.length} maps · MT0 to MT23 · Table 6.13`}
                  text={<>The 24-floor tower as the game starts each floor (MT23 has three wings), with how many of the {tower.runs.length} tower runs
                    cited by the thesis reached it. The whole tower is playable in the <Link className="link" href="/tower/">Tower Game</Link>.</>}>
        <div className="card-grid">
          {tower.floors.map((f) => {
            const n = reached(f.id);
            return (
              <Link key={f.id} href={`/floors/${f.id}/`} className="card-link">
                <div className="flex items-start gap-3">
                  <div className="shrink-0"><TowerThumb floor={{ id: f.id, width: f.width, height: f.height, grid: f.grid }} tiles={tilesOf(f.grid)} /></div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="heading text-[16px]">{f.id}</span>
                    <span className="text-[13px] muted">{towerFloorTitle(f.id)}</span>
                    <span className="mono text-[13px]">{f.monsters.reduce((s, m) => s + m.count, 0)} monsters · {f.doors.yellow + f.doors.blue + f.doors.red} doors</span>
                    <span className="text-[13px] muted">{n ? `reached by ${n} of ${tower.runs.length} runs` : "no thesis run reached it"}</span>
                  </div>
                </div>
                {TOWER_NOTES[f.id] && <span className="muted text-[13px]">{TOWER_NOTES[f.id]}</span>}
              </Link>
            );
          })}
        </div>
      </FloorGroup>
    </div>
  );
}
