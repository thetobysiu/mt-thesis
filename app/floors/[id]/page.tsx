import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoutePlayer } from "@/components/RoutePlayer";
import { getEpisodes, getFloors, getFloorText, getSolution } from "@/lib/data";
import { floorBlurb, floorTitle, TOWER_FLOORS, towerFloorTitle } from "@/lib/floors";
import { modelName, pct } from "@/lib/format";
import { compareWithRoute } from "@/lib/route-compare";
import { TowerFloorView } from "./TowerFloorView";

export const dynamicParams = false;
export function generateStaticParams() {
  return [...getFloors().map((f) => ({ id: f.id })), ...TOWER_FLOORS.map((id) => ({ id }))];
}

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: TOWER_FLOORS.includes(id) ? `${id} · ${towerFloorTitle(id)} of the tower` : floorTitle(id) };
}

export default async function FloorPage({ params }: Params) {
  const { id } = await params;
  if (TOWER_FLOORS.includes(id)) return <TowerFloorView id={id} />;
  const f = getFloors().find((x) => x.id === id);
  if (!f) notFound();
  const text = getFloorText(id);
  const solution = getSolution(id);
  const eps = getEpisodes().episodes.filter((e) => e.floor === id && e.model);
  const byModel = new Map<string, { n: number; wins: number; best: number | null }>();
  for (const e of eps) {
    const m = modelName(e.model);
    const s = byModel.get(m) ?? { n: 0, wins: 0, best: null };
    s.n++;
    if (e.success) { s.wins++; s.best = Math.max(s.best ?? -Infinity, e.finalHp ?? -Infinity); }
    byModel.set(m, s);
  }
  const wins = eps.filter((e) => e.success).sort((a, b) => (b.finalHp ?? 0) - (a.finalHp ?? 0));
  const cmp = compareWithRoute(id, text, solution, [...wins].sort((a, b) => a.id.localeCompare(b.id)));
  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Floor</span>
        <h1>{floorTitle(id)}</h1>
        <p className="lead">{floorBlurb(f)}</p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/play/${id}/`}>Play this floor</Link>
          <Link className="btn" href={`/episodes/?floor=${id}`}>All {eps.length} model episodes</Link>
        </div>
      </section>

      <div className="kpis">
        <div className="kpi"><span className="v">{f.exact.hp} HP</span><span className="k">exact optimum: the most HP left when the boss falls</span></div>
        <div className="kpi"><span className="v">{f.published.hp ?? "–"} HP</span><span className="k">answer of the published solver{f.published.hp !== f.exact.hp ? " (misses the optimum)" : ""}</span></div>
        <div className="kpi"><span className="v">{f.exact.winningSets}</span><span className="k">winning sets of cleared monsters and doors ({f.exact.optimalSets} optimal)</span></div>
        <div className="kpi"><span className="v">{f.width} × {f.height}</span><span className="k">{f.exact.decisions} decisions on the optimal route · {f.exact.states.toLocaleString("en")} search states</span></div>
      </div>

      <section className="flex flex-col gap-3">
        <h2>Optimal route</h2>
        <RoutePlayer id={id} text={text} solution={solution} />
      </section>

      {cmp && (
        <section className="flex flex-col gap-3" id="route-vs-win">
          <h2>Optimal route against the models&apos; wins</h2>
          <p>
            {cmp.wins} model episode{cmp.wins === 1 ? "" : "s"} won this floor; {cmp.optimalWins === 0 ? "none reaches" : `${cmp.optimalWins} reach${cmp.optimalWins === 1 ? "es" : ""}`} the
            optimum of {cmp.optimum} HP. Below, monsters and doors only, the exact optimal route next to{" "}
            {cmp.groupSize === cmp.largest
              ? <>the most common winning trajectory ({cmp.groupSize === 1 ? "no two wins share one" : `${cmp.groupSize} wins clear the same monsters and doors in the same order`})</>
              : <>the most common winning trajectory with computed state values ({cmp.groupSize} win{cmp.groupSize === 1 ? "" : "s"}; the most common trajectory overall, {cmp.largest} wins, has none)</>}
            , as played in <Link className="link" href={`/episodes/${cmp.episode.id}/`}>this {modelName(cmp.episode.model)} episode (final HP {cmp.episode.finalHp})</Link>.
          </p>
          {cmp.departure ? (
            <div className="widget">
              <div className="body flex flex-col gap-1 text-[14px]">
                <p>
                  <span className="tag tag-warn">turn {cmp.departure.turn}</span>{" "}
                  {cmp.departure.exact ? "The trajectory leaves the optimal route here: " : "First step that differs from this optimal route: "}
                  <strong>{cmp.departure.label}</strong>
                  {cmp.departure.expected ? <> where the route takes <strong>{cmp.departure.expected}</strong></> : null}.
                  {cmp.departure.exact && cmp.departure.before != null && cmp.departure.after != null
                    ? <> The state value (the most HP still reachable at the boss) falls from {cmp.departure.before} to {cmp.departure.after} HP.</> : null}
                </p>
                {!cmp.departure.exact && (
                  <p className="muted text-[13px]">No state values were computed for this episode, so this is a difference in order, not a measured loss: another order can be equally good.</p>
                )}
                <p><Link className="link" href={`/episodes/${cmp.episode.id}/?t=${cmp.departure.turn}`}>Open the episode at turn {cmp.departure.turn}</Link> to read the model&apos;s reasoning there.</p>
              </div>
            </div>
          ) : (
            <p className="muted">This trajectory keeps the optimal value to the end.</p>
          )}
          <div className="grid gap-[var(--gap)] lg:grid-cols-2">
            <div className="widget">
              <header><span className="w-title">Exact optimal route</span><span className="w-actions muted">{cmp.route.length} decisions</span></header>
              <div className="body scroll-x">
                <table className="tbl">
                  <thead><tr><th className="num">#</th><th>clears</th><th className="num">HP after</th></tr></thead>
                  <tbody>
                    {cmp.route.map((r, i) => <tr key={i}><td className="num">{i + 1}</td><td className="whitespace-normal">{r.label}</td><td className="num">{r.hp}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="widget">
              <header><span className="w-title">Most common winning trajectory</span><span className="w-actions muted">{cmp.groupSize} episode{cmp.groupSize === 1 ? "" : "s"}</span></header>
              <div className="body scroll-x">
                <table className="tbl">
                  <thead><tr><th className="num">turn</th><th>action</th><th className="num">HP after</th>{cmp.steps.some((s) => s.value != null) ? <th className="num">value</th> : null}</tr></thead>
                  <tbody>
                    {cmp.steps.map((s) => (
                      <tr key={s.turn} className={s.status === "after" ? "opacity-60" : undefined}>
                        <td className="num"><Link className="link" href={`/episodes/${cmp.episode.id}/?t=${s.turn}`}>{s.turn}</Link></td>
                        <td className="whitespace-normal">
                          {s.label}
                          {s.assisted ? <span className="tag ml-1">assisted</span> : null}
                          {s.status === "departure" ? <span className="tag tag-warn ml-1">leaves the route</span> : null}
                        </td>
                        <td className="num">{s.hp ?? "–"}</td>
                        {cmp.steps.some((x) => x.value != null) ? <td className="num">{s.value ?? "–"}</td> : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2>Model episodes on this floor</h2>
        {eps.length === 0 ? <p className="muted">No model played this floor.</p> : (
          <div className="grid gap-[var(--gap)] lg:grid-cols-2">
            <div className="widget">
              <header><span className="w-title">By model</span></header>
              <div className="body scroll-x">
                <table className="tbl">
                  <thead><tr><th>model</th><th className="num">episodes</th><th className="num">won</th><th className="num">best final HP</th></tr></thead>
                  <tbody>
                    {[...byModel].sort((a, b) => b[1].n - a[1].n).map(([m, s]) => (
                      <tr key={m}><td>{m}</td><td className="num">{s.n}</td><td className="num">{s.wins}</td><td className="num">{s.best ?? "–"}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted text-[13px] mt-2">All stored episodes on this floor, every configuration together; the thesis reports them per cell (see Results).</p>
              </div>
            </div>
            <div className="widget">
              <header><span className="w-title">Wins ({wins.length})</span></header>
              <div className="body scroll-x max-h-[420px] overflow-auto">
                {wins.length === 0 ? <p className="muted">No model episode won this floor.</p> : (
                  <table className="tbl">
                    <thead><tr><th>model</th><th className="num">final HP</th><th className="num">of optimum</th><th>cell</th><th /></tr></thead>
                    <tbody>
                      {wins.slice(0, 200).map((e) => (
                        <tr key={e.id}>
                          <td>{modelName(e.model)}</td><td className="num">{e.finalHp}</td><td className="num">{pct(e.hpRatio)}</td>
                          <td className="mono text-[12px]">{e.cells[0]?.label ?? ""}</td>
                          <td><Link className="link" href={`/episodes/${e.id}/`}>replay</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
