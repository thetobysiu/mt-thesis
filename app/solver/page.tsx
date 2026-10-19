import type { Metadata } from "next";
import Link from "next/link";
import { SolverExplorer } from "@/components/SolverExplorer";
import { getFloors, getFloorText } from "@/lib/data";
import { floorRank, floorTitle, HEAVY } from "@/lib/floors";

export const metadata: Metadata = { title: "Exact solver" };

export default function SolverPage() {
  const floors = [...getFloors()].filter((f) => !HEAVY.has(f.id)).sort((a, b) => floorRank(a.id) - floorRank(b.id))
    .map((f) => ({ id: f.id, title: floorTitle(f.id), text: getFloorText(f.id), optimum: f.exact.hp, published: f.published.hp }));
  return (
    <div className="page page-wide">
      <section className="flex flex-col gap-3 max-w-[90ch]">
        <span className="eyebrow">Explore</span>
        <h1>The exact solver, step by step</h1>
        <p className="lead">
          The solver turns a floor into a graph of nodes (monsters, doors and merged groups of items) and searches over the sets of nodes the
          hero has cleared. Every state is a cleared set with the hero&apos;s HP, attack, defence and keys. Step through the search and watch
          which states it keeps.
        </p>
        <p className="muted text-[13px]">
          The search runs in your browser. The complex floor and hand03 are left out here because their search takes minutes; their exact
          and published routes are on the floor pages of <Link className="link" href="/floors/complex/">complex</Link> and{" "}
          <Link className="link" href="/floors/hand03/">hand03</Link>.
        </p>
      </section>
      <SolverExplorer floors={floors} />
    </div>
  );
}
