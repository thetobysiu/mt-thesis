import type { Metadata } from "next";
import Link from "next/link";
import { FloorBars, type FloorRow } from "@/components/tour/Bars";
import { getCell } from "@/lib/data";

export const metadata: Metadata = {
  title: "Tower",
  description: "The 24-floor tower: every stored tower run with its replay, the highest floor reached per observation, and the original game to play in the browser.",
};

// Table 6.13: cell, agent, observation, and the reason the runs stopped (quoted from the table)
const ROWS: { cell: string; agent: string; obs: string; stopped: string }[] = [
  { cell: "tower_MT0-MT23w_heuristic_final7", agent: "Rule-based heuristic", obs: "—", stopped: "Red Bats lethal" },
  { cell: "tower_qwen3.5-397b_final2", agent: "Qwen3.5-397B", obs: "first", stopped: "stuck; 131 EXP unspent" },
  { cell: "tower_deepseek-v4-flash_final2_reactive", agent: "DeepSeek-V4-Flash", obs: "first", stopped: "stuck; one run at 25 HP on MT3" },
  { cell: "tower_qwen3.5-397b_final3_reactive", agent: "Qwen3.5-397B", obs: "second", stopped: "Red Bats unaffordable" },
  { cell: "tower_deepseek-v4-flash_final3_reactive", agent: "DeepSeek-V4-Flash", obs: "second", stopped: "Red Bats unaffordable" },
  { cell: "tower_qwen3.5-397b_final11_reactive", agent: "Qwen3.5-397B", obs: "final", stopped: "MT18: no blue key left; MT8: only lethal fights" },
  { cell: "tower_deepseek-v4-flash_final11_reactive", agent: "DeepSeek-V4-Flash", obs: "final", stopped: "MT17: upgraded monsters; MT8: Senior Mage lethal" },
  { cell: "tower_qwen3.6-35b_final11_reactive", agent: "Qwen3.6-35B", obs: "final", stopped: "MT16: Red Demon King unwinnable; MT8: Red Bats lethal" },
  { cell: "tower_mistral-medium-3.5_final11_reactive", agent: "Mistral Medium 3.5", obs: "final", stopped: "MT4: Skeletons lethal at 5 and 30 HP" },
  { cell: "tower_qwen3.5-397b_final11_resume_blue", agent: "Qwen3.5-397B", obs: "resumed on MT18", stopped: "won: normal ending on MT21 at turn 832" },
  { cell: "tower_deepseek-v4-flash_final11_resume_blue", agent: "DeepSeek-V4-Flash", obs: "resumed on MT18", stopped: "turn limit (860)" },
];

const KEYS: [string, string][] = [
  ["Arrow keys, or click a tile", "move; walking into a monster fights it, into a door opens it with a key, onto an item picks it up"],
  ["X", "monster manual: what every monster on this floor costs at your current stats"],
  ["S / D", "save / load (saves stay in this browser)"],
  ["A / W", "undo to the automatic save / redo"],
  ["G", "floor teleporter, once you have it"],
  ["V", "quick shop: the shops you have visited"],
  ["T / Q", "items / equipment"],
  ["PgUp / PgDn", "look at the maps of other floors"],
  ["Esc", "menu (settings, statistics, restart)"],
  ["N", "start over on MT0"],
  ["Space or Enter", "confirm; advance dialogue"],
];

export default function TowerPage() {
  const best = ROWS.map((r): FloorRow | null => {
    const c = getCell(r.cell);
    return c?.floorsMax != null ? { label: r.agent, sub: r.obs === "—" ? undefined : r.obs.startsWith("resumed") ? r.obs : `${r.obs} observation`,
                                   floor: c.floorsMax, href: `/results/${r.cell}/`, group: r.obs.startsWith("resumed") ? "r" : r.obs === "final" ? "3" : r.obs === "second" ? "2" : r.obs === "first" ? "1" : "h",
                                   note: c.successes ? "normal ending" : undefined } : null;
  }).filter((x): x is FloorRow => !!x);

  return (
    <div className="page">
      <section className="hero flex flex-col gap-4">
        <span className="eyebrow">Explore · Sections 4.5.2, 6.7.3</span>
        <h1>The 24-floor tower</h1>
        <p className="lead">
          The tower has floors MT0 to MT23, six shops, keys carried from floor to floor and scripted events; the normal ending is the defeat of the
          Nether Demon King on MT21. The heuristic stops on MT8. The highest floor reached rose from MT7 with the first tower observation to MT18
          with the final one, and a run resumed on MT18 reached the normal ending.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary" href="#play">Play the original game</a>
          <a className="btn" href="#runs">All tower runs</a>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="best">
        <h2 id="best">Highest floor reached</h2>
        <FloorBars rows={best} groups={[{ id: "h", label: "heuristic", colour: "#94A3B8" }, { id: "1", label: "first observation", colour: "#64748B" },
                                        { id: "2", label: "second", colour: "#38BDF8" }, { id: "3", label: "final", colour: "#F59E0B" }, { id: "r", label: "resumed on MT18", colour: "#22C55E" }]}
                   caption="Best run per row of Table 6.13; the green mark is MT21, the normal ending. The first two observations also ran with the item values of another edition, a 40 % HP override and a 40 % rule, so the comparison is between whole configurations." />
      </section>

      <section id="runs" className="flex flex-col gap-3 scroll-mt-20" aria-labelledby="runs-h">
        <h2 id="runs-h">Every run</h2>
        <div className="scroll-x">
          <table className="tbl text-[13px]">
            <thead><tr><th>Agent</th><th>Observation</th><th>Runs (highest floor, open the replay)</th><th>Stopped because</th></tr></thead>
            <tbody>
              {ROWS.map((r) => {
                const c = getCell(r.cell);
                if (!c) return null;
                return (
                  <tr key={r.cell}>
                    <td><Link className="link" href={`/results/${r.cell}/`}>{r.agent}</Link></td>
                    <td>{r.obs}</td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        {c.runs.map((run, i) => run.episode
                          ? <Link key={i} className={`tag ${run.success ? "tag-ok" : ""}`} href={`/episodes/${run.episode}/`}>{run.maxFloor ?? "?"}</Link>
                          : <span key={i} className="tag">{run.maxFloor ?? "?"}</span>)}
                      </span>
                    </td>
                    <td className="muted">{r.stopped}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="muted text-[12px] mt-1">
            The highest floor is a result on the thesis engine, which models 19 of the 23 scripted events up to MT21 (Table B.4); its map can differ from
            the original game&apos;s where the remaining scripts change tiles. Tower replays show every visited floor; switch floors above the map.
          </p>
        </div>
      </section>

      <section id="play" className="flex flex-col gap-3 scroll-mt-20" aria-labelledby="play-h">
        <h2 id="play-h">Play the original game</h2>
        <p className="max-w-[85ch]">
          This is the original HTML5 game the engine reads its data from (24-floor sample tower of ckcz123/mota-js, BSD 3-Clause), with an English
          layer added for this site. It starts on MT0 straight away: the opening is skipped and the fairy&apos;s three keys are already given, as in
          the thesis engine, and the game runs in the original&apos;s express mode (no battle animation; a weak floor teleporter is in the inventory).
          It plays music once you interact with it.
        </p>
        <div className="grid gap-[var(--gap)] xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="panel p-2">
            <iframe src="/game/24/play.html" title="24-floor Magic Tower (original game, English)" className="w-full rounded border-0 bg-black" style={{ aspectRatio: "4 / 3", minHeight: 420 }}
                    allow="autoplay; fullscreen" loading="lazy" />
            <p className="text-[12px] muted mt-1">
              Click into the game before using the keyboard. <a className="link" href="/game/24/play.html" target="_blank" rel="noopener">Open full screen</a>
              {" · "}<a className="link" href="/game/24/index.html" target="_blank" rel="noopener">the untouched original</a> (Chinese, with its title screen and mode choice).
            </p>
          </div>
          <div className="panel p-3 flex flex-col gap-2 text-[13px]">
            <b>Controls</b>
            <dl className="m-0 flex flex-col gap-1">
              {KEYS.map(([k, v]) => <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-2"><dt className="mono">{k}</dt><dd className="m-0 muted">{v}</dd></div>)}
            </dl>
            <b className="mt-2">What matters</b>
            <ul className="m-0 pl-4 flex flex-col gap-1 muted">
              <li>A fight costs (monster ATK − your DEF) per monster strike; you strike first, so the monster strikes one time fewer than you do. Nothing is random.</li>
              <li>Yellow, blue and red keys open doors of their colour and are used up.</li>
              <li>The gold shop is on MT3, the experience shop on MT5; on MT16 the Red Demon King needs ATK above 1,000.</li>
              <li>The status bar on the left shows floor, HP, ATK, DEF, gold, EXP and keys.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
