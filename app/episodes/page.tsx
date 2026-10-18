import type { Metadata } from "next";
import { EpisodeBrowser } from "@/components/EpisodeBrowser";
import { getEpisodes } from "@/lib/data";

export const metadata: Metadata = { title: "Episodes" };

export default function EpisodesPage() {
  const n = getEpisodes().episodes.length;
  return (
    <div className="page">
      <section className="flex flex-col gap-2">
        <h1>Episodes</h1>
        <p className="lead">
          All {n.toLocaleString("en")} stored episodes and tower runs named by a result file. Each replay shows, at every turn, what the engine
          showed the model (the observation), what the model reasoned and what it answered, next to the map as it was at that moment.
        </p>
      </section>
      <EpisodeBrowser />
    </div>
  );
}
