import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeViewer } from "@/components/EpisodeViewer";
import { Outcome } from "@/components/Outcome";
import { getEpisode, getEpisodes } from "@/lib/data";
import { modelName, pct, scenarioName } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return getEpisodes().episodes.map((e) => ({ id: e.id }));
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const e = getEpisode((await params).id);
  return { title: e ? `${scenarioName(e.floor)} · ${modelName(e.model)} · ${e.id}` : "Episode" };
}

export default async function EpisodePage({ params }: Params) {
  const { id } = await params;
  const e = getEpisode(id);
  if (!e) notFound();
  return (
    <div className="page page-wide">
      <section className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="eyebrow w-full">{e.tower ? "Tower run" : "Episode"}</span>
        <h1>{scenarioName(e.floor)} · {modelName(e.model)}</h1>
        <Outcome e={e} />
        {!e.tower && e.hpRatio != null && <span className="muted">final HP / optimum {pct(e.hpRatio)}</span>}
        <span className="muted">{e.turns} turns, {e.decisions} model decisions</span>
        {e.started && <span className="muted">{e.started.slice(0, 16).replace("T", " ")}</span>}
        <span className="muted text-[13px]">
          {e.cells.length ? <>in {e.cells.map((c, i) => (
            <span key={`${c.file}-${c.run}`}>{i ? ", " : ""}
              {c.file.startsWith("results/reliability/")
                ? <Link className="link mono" href={`/results/${c.label}/`}>{c.label}</Link>
                : <a className="link mono" href={`/data/${c.file}`}>{c.label}</a>}
              {c.run != null ? ` #${c.run}` : ""}
            </span>
          ))}</> : null}
          {" · "}<a className="link" href={`/data/episodes/${e.id}.json.gz`} download>log (gzipped JSON)</a>
        </span>
      </section>
      <EpisodeViewer id={e.id} />
    </div>
  );
}
