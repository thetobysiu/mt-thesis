import type { Metadata } from "next";
import { SolverExplorer } from "@/components/SolverExplorer";
import { getFloors, getFloorText, getSolution } from "@/lib/data";
import { floorRank, floorTitle, HEAVY } from "@/lib/floors";

export const metadata: Metadata = { title: "BFS solver" };

export default function SolverPage() {
  const floors = [...getFloors()].sort((a, b) => floorRank(a.id) - floorRank(b.id))
    .map((f) => ({ id: f.id, title: floorTitle(f.id), text: getFloorText(f.id), optimum: f.exact.hp, published: f.published.hp,
                   solution: HEAVY.has(f.id) ? getSolution(f.id) : undefined }));
  return (
    <div className="page page-wide">
      <section className="flex flex-col gap-3 max-w-[90ch]">
        <span className="eyebrow">Explore</span>
        <h1>The BFS solver, step by step</h1>
        <p className="lead">
          The thesis checks every floor with an exact breadth-first search (BFS). It turns a floor into a graph of nodes (monsters, doors
          and merged groups of items) and searches over the sets of nodes the hero has cleared. Every state is a cleared set with the
          hero&apos;s HP, attack, defence and keys. Step through the search and watch which states it keeps.
        </p>
        <p className="muted text-[13px]">
          The search runs in your browser. On the complex floor and hand03 it takes minutes and a lot of memory, so those two show the
          stored result of the same search instead.
        </p>
      </section>
      <SolverExplorer floors={floors} />
    </div>
  );
}
