import Link from "next/link";
import { getCell, getEpisode, getEpisodes, getResults } from "@/lib/data";
import { SITE } from "@/lib/site";

const FEATURED: { cell: string; run: number; turn: number | "resume"; title: string; text: string }[] = [
  { cell: "simple_qwen3.5-397b_canon", run: 0, turn: 2, title: "The first decision on the simple floor",
    text: "Four legal actions; only one keeps the floor winnable. Watch what Qwen3.5-397B saw and why it chose the Black Slime." },
  { cell: "simple_qwen3.5-397b_canon", run: 0, turn: 15, title: "Where the winning trajectory leaves the optimal route",
    text: "Turn 15: the Slime Lord before the Bat. The episode still wins, at 2 HP instead of the optimum 13." },
  { cell: "tower_qwen3.5-397b_final11_resume_blue", run: 0, turn: "resume", title: "The tower run that reached the normal ending",
    text: "A stored run resumed on MT18 with blue keys for sale, played on to the Nether Demon King on MT21." },
];

export default function Home() {
  const r = getResults();
  const n = getEpisodes().episodes.length;
  const featured = FEATURED.map((f) => {
    const ep = getCell(f.cell)?.runs[f.run]?.episode;
    if (!ep) return null;
    const resumed = getEpisode(ep)?.resumedAfter;
    const turn = f.turn === "resume" ? (resumed != null ? resumed + 1 : null) : f.turn;
    return { ...f, href: `/episodes/${ep}/${turn != null ? `?t=${turn}` : ""}` };
  }).filter((f) => f != null);
  return (
    <div className="page">
      <section className="flex flex-col gap-3 pt-4">
        <p className="muted text-[12px] tracking-wide">{SITE.degree} · {SITE.university} · {SITE.status}</p>
        <h1 className="text-[26px] max-w-[44ch]">{SITE.title}</h1>
        <p className="muted">{SITE.author} · supervised by {SITE.supervisors.join(" and ")}</p>
        <p className="lead">
          A language model plays Magic Tower, a deterministic game decided by the order of fights, doors and items. A deterministic engine
          lists the legal actions with their exact costs, the model chooses one, and an exact solver knows each floor&apos;s optimum. This site
          holds the evidence behind the thesis: every result file, every episode with the model&apos;s reasoning at each turn, and the route
          from the first experiments to the final configuration.
        </p>
      </section>

      <section className="card-grid">
        <Link className="card-link" href="/results/">
          <span className="heading">Results</span>
          <span className="muted">{r.cells.filter((c) => c.thesis).length} cells behind the thesis tables, each with its settings, episodes and re-run command.</span>
        </Link>
        <Link className="card-link" href="/episodes/">
          <span className="heading">Episodes</span>
          <span className="muted">{n.toLocaleString("en")} replays: map, observation, reasoning and answer at every turn.</span>
        </Link>
      </section>

      {featured.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2>Start here</h2>
          <div className="card-grid">
            {featured.map((f) => (
              <Link key={f.title} className="card-link" href={f.href}>
                <span className="heading text-[13px]">{f.title}</span>
                <span className="muted">{f.text}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
