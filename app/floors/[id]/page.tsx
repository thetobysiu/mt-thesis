import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RoutePlayer } from "@/components/RoutePlayer";
import { getEpisodes, getFloors, getFloorText, getSolution } from "@/lib/data";
import { floorBlurb, floorTitle } from "@/lib/floors";
import { modelName, pct } from "@/lib/format";

export const dynamicParams = false;
export function generateStaticParams() {
  return getFloors().map((f) => ({ id: f.id }));
}

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: floorTitle((await params).id) };
}

export default async function FloorPage({ params }: Params) {
  const { id } = await params;
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
