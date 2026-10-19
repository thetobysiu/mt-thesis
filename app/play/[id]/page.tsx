import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Player } from "@/components/Player";
import { getFloors, getFloorText } from "@/lib/data";
import { floorBlurb, floorTitle } from "@/lib/floors";

export const dynamicParams = false;
export function generateStaticParams() {
  return getFloors().map((f) => ({ id: f.id }));
}

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `Play ${floorTitle((await params).id)}` };
}

export default async function PlayFloorPage({ params }: Params) {
  const { id } = await params;
  const f = getFloors().find((x) => x.id === id);
  if (!f) notFound();
  return (
    <div className="page page-wide">
      <section className="flex flex-col gap-2 max-w-[90ch]">
        <span className="eyebrow">Play</span>
        <h1>{floorTitle(id)}</h1>
        <p className="muted">
          {floorBlurb(f)} Defeat the boss with as much HP as you can; the optimum is {f.exact.hp} HP. Click a ringed tile on the map
          or an action in the list. Fights cost exactly what the list says; keys open one door each.
        </p>
      </section>
      <Player id={id} text={getFloorText(id)} optimum={f.exact.solvable ? f.exact.hp : null} title={floorTitle(id)} />
    </div>
  );
}
