import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EpisodeViewer } from "@/components/EpisodeViewer";
import { Outcome } from "@/components/Outcome";
import { getCell, getEpisode, getEpisodes, getFloors, getFloorText, readEpisodeLog } from "@/lib/data";
import type { EpisodeEntry } from "@/lib/data-types";
import { parseFloor } from "@/lib/engine/floor";
import { calcEnemyDmg, modelName, pct, scenarioName } from "@/lib/format";

export const dynamicParams = false;

/** Why a single-floor episode stopped alive with the boss alive: the engine's stop reason and the boss's cost at the end. */
function whyNotWon(e: EpisodeEntry): string | null {
  if (e.tower || e.success || e.died || !e.hasResult || !getFloors().some((f) => f.id === e.floor)) return null;
  const log = readEpisodeLog(e.id);
  const last = log.turns.filter((t) => t.type === "turn" && t.hero).at(-1);
  const stop = log.turns.filter((t) => t.type === "stuck" || t.type === "stopped").at(-1);
  const def = parseFloor(e.floor, getFloorText(e.floor));
  const boss = def.monsters[299];
  if (!last?.hero) return stop ? String(stop.reason ?? stop.message ?? "") : null;
  const h = last.hero;
  const left = last.enemies_remaining;
  const cost = boss ? calcEnemyDmg({ atk: h.atk, def: h.def, mdef: h.mdef }, { hp: boss.hp, atk: boss.atk, def: boss.def, specials: boss.special ? [boss.special] : [] }) : null;
  const where = left === 1 ? "Only the boss was left" : left != null ? `${left} monsters were left, the boss among them` : "The boss was still alive";
  const bossPart = !boss ? "" : cost == null ? `, and at ATK ${h.atk} the hero cannot damage it (its DEF is ${boss.def})`
    : cost >= h.hp ? `, and at ATK ${h.atk} / DEF ${h.def} it would cost ${cost} HP with ${h.hp} HP left` : "";
  const engine = stop ? ` The engine stopped the episode ("${String(stop.reason ?? stop.message ?? "").replace(/^Stuck\s*[—-]\s*/, "")}"): positions where only losing fights remain end here instead of being played into a death.` : "";
  return `${where}${bossPart}.${engine}`;
}

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
  // a partner from the same cell, preferably with the other outcome, for the side-by-side comparison
  const cellLabel = e.cells[0]?.label;
  const mates = !e.tower && cellLabel ? getEpisodes().episodes.filter((x) => x.id !== e.id && x.floor === e.floor && x.cells.some((c) => c.label === cellLabel)) : [];
  const partner = mates.find((x) => !!x.success !== !!e.success) ?? mates[0];
  const bare = e.cells.some((c) => /(^|_)bare(_|$)/.test(c.label) || getCell(c.label)?.env?.MOTA_BARE_OBS === "1");
  const why = whyNotWon(e);
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
          {partner && <>{" · "}<Link className="link" href={`/compare/?a=${e.id}&b=${partner.id}`}>compare with another episode of this cell</Link></>}
        </span>
      </section>
      {why && (
        <p className="panel p-3 text-[13px] max-w-[120ch]">
          <span className="tag tag-warn">why not won</span> {why}
        </p>
      )}
      {bare && (
        <p className="panel p-3 text-[13px] max-w-[120ch]">
          <span className="tag tag-warn">bare observation</span>{" "}
          This episode ran with the bare observation (<Link className="link" href="/thesis/method/#s-5-2-7">Section 5.2.7</Link>). At each
          decision the model saw its stats, the remaining items, the boss and the legal actions with their exact cost, and its system prompt
          lists the floor&apos;s monsters, items and doors by coordinate. It saw no walls and no lookahead tree, so where its reasoning says a
          fight &ldquo;leads&rdquo; is its own guess from coordinates; under the full observation the engine&apos;s tree states what each action opens.
        </p>
      )}
      <EpisodeViewer id={e.id} floor={getFloors().some((f) => f.id === e.floor) ? e.floor : null} />
    </div>
  );
}
