import Link from "next/link";
import { TowerFloorMap, type StatsOption } from "@/components/TowerMap";
import { getCell, getTowerFloors } from "@/lib/data";
import { modelName, SPECIAL_NAMES } from "@/lib/format";
import { TOWER_FLOORS, TOWER_NOTES, towerFloorTitle, towerRunLabel } from "@/lib/floors";

export function TowerFloorView({ id }: { id: string }) {
  const t = getTowerFloors();
  const f = t.floors.find((x) => x.id === id)!;
  const i = TOWER_FLOORS.indexOf(id);
  const prev = TOWER_FLOORS[i - 1], next = TOWER_FLOORS[i + 1];
  const runNo = (cell: string, episode: string) => (getCell(cell)?.runs.findIndex((r) => r.episode === episode) ?? -1) + 1;
  const visits = t.runs.filter((r) => r.arrivals[id])
    .map((r) => ({ ...r, at: r.arrivals[id], obs: towerRunLabel(r.cell), run: runNo(r.cell, r.episode) }))
    .sort((a, b) => a.obs.localeCompare(b.obs) || modelName(a.model).localeCompare(modelName(b.model)) || a.run - b.run);
  const options: StatsOption[] = visits.map((v) => ({
    label: `${modelName(v.model)}, ${v.obs}${v.run ? ` run ${v.run}` : ""}, on arrival (HP ${v.at.hp}, ATK ${v.at.atk}, DEF ${v.at.def})`,
    stats: v.at,
  }));
  const tiles = Object.fromEntries([...new Set(f.grid.flat())].map((n) => [n, t.tiles[n]]));
  const monsters = f.monsters.reduce((s, m) => s + m.count, 0);

  return (
    <div className="page">
      <section className="flex flex-col gap-3">
        <span className="eyebrow">Tower floor</span>
        <h1>{id}</h1>
        <p className="lead">
          {towerFloorTitle(id)} of the 24-floor tower, as the game starts it. {TOWER_NOTES[id] ?? ""}{" "}
          {visits.length ? `${visits.length} of the ${t.runs.length} tower runs cited by the thesis reached it.` : "No tower run cited by the thesis reached it."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href="/tower/">Play the Tower Game</Link>
          {prev && <Link className="btn" href={`/floors/${prev}/`}>← {prev}</Link>}
          {next && <Link className="btn" href={`/floors/${next}/`}>{next} →</Link>}
          <Link className="btn" href="/floors/#tower">All tower floors</Link>
        </div>
      </section>

      <div className="kpis">
        <div className="kpi"><span className="v">{monsters}</span><span className="k">monsters, {f.monsters.length} kinds</span></div>
        <div className="kpi"><span className="v">{f.doors.yellow} / {f.doors.blue} / {f.doors.red}</span><span className="k">yellow / blue / red doors</span></div>
        <div className="kpi"><span className="v">{f.items.reduce((s, x) => s + x.count, 0)}</span><span className="k">items</span></div>
        <div className="kpi"><span className="v">{f.width} × {f.height}</span><span className="k">tiles</span></div>
      </div>

      <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
        <section className="widget min-h-[560px]">
          <header><span className="w-title">Map</span><span className="w-actions muted">hover a tile for its stats</span></header>
          <div className="body flex-1 flex flex-col">
            <TowerFloorMap floor={{ id: f.id, width: f.width, height: f.height, grid: f.grid }} tiles={tiles} hero={f.hero} options={options} />
          </div>
        </section>
        <div className="flex flex-col gap-[var(--gap)] min-w-0">
          <section className="widget">
            <header><span className="w-title">Monsters</span><span className="w-actions muted">game data (enemys.js)</span></header>
            <div className="body scroll-x">
              {f.monsters.length === 0 ? <p className="muted">No monsters on this floor.</p> : (
                <table className="tbl">
                  <thead><tr><th>monster</th><th className="num">on floor</th><th className="num">HP</th><th className="num">ATK</th><th className="num">DEF</th><th className="num">gold</th><th className="num">EXP</th><th>special</th></tr></thead>
                  <tbody>
                    {f.monsters.map((m) => (
                      <tr key={m.key}>
                        <td>{m.name}</td><td className="num">{m.count}</td><td className="num">{m.hp.toLocaleString("en")}</td><td className="num">{m.atk.toLocaleString("en")}</td>
                        <td className="num">{m.def.toLocaleString("en")}</td><td className="num">{m.money}</td><td className="num">{m.exp}</td>
                        <td className="whitespace-normal">{m.specials.map((s) => SPECIAL_NAMES[s] ?? `#${s}`).join(", ") || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          <section className="widget">
            <header><span className="w-title">Items</span></header>
            <div className="body scroll-x">
              {f.items.length === 0 ? <p className="muted">No items on this floor.</p> : (
                <table className="tbl">
                  <thead><tr><th>item</th><th className="num">on floor</th><th>effect</th></tr></thead>
                  <tbody>{f.items.map((x) => <tr key={x.key}><td>{x.name}</td><td className="num">{x.count}</td><td className="whitespace-normal muted">{x.effect || "–"}</td></tr>)}</tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="widget">
        <header><span className="w-title">Tower runs that reached {id}</span><span className="w-actions muted">open a run at its first turn here</span></header>
        <div className="body scroll-x">
          {visits.length === 0 ? <p className="muted">None of the thesis tower runs reached this floor.</p> : (
            <table className="tbl">
              <thead><tr><th>agent</th><th>observation</th><th className="num">run</th><th className="num">first turn here</th><th className="num">HP</th><th className="num">ATK</th><th className="num">DEF</th><th>highest floor</th></tr></thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.episode}>
                    <td><Link className="link" href={`/results/${v.cell}/`}>{modelName(v.model)}</Link></td>
                    <td>{v.obs}</td>
                    <td className="num">{v.run || "–"}</td>
                    <td className="num"><Link className="link" href={`/episodes/${v.episode}/?t=${v.at.turn}`}>turn {v.at.turn}</Link></td>
                    <td className="num">{v.at.hp.toLocaleString("en")}</td><td className="num">{v.at.atk}</td><td className="num">{v.at.def}</td>
                    <td><span className={`tag ${v.success ? "tag-ok" : ""}`}>{v.maxFloor ?? "?"}{v.success ? " · normal ending" : ""}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted text-[12px] mt-2">
            Stats are the hero&apos;s on arrival, before the first action on this floor. The thesis engine models 19 of the 23 scripted events up to
            MT21 (Table B.4), so a run&apos;s map can differ from the game&apos;s where the remaining scripts change tiles.
          </p>
        </div>
      </section>
    </div>
  );
}
