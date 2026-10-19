import Link from "next/link";
import { IconChevronRight, IconCompass, IconReplay, IconTable } from "@/components/Icons";
import { getCell, getEpisode, getEpisodes, getResults } from "@/lib/data";
import { SITE } from "@/lib/site";

const FEATURED: { cell: string; run: number; turn: number | "resume"; title: string; text: string }[] = [
  { cell: "simple_qwen3.5-397b_canon", run: 0, turn: 2, title: "The first decision on the simple floor",
    text: "Four legal actions; only one keeps the floor winnable. See what Qwen3.5-397B saw and why it chose the Black Slime." },
  { cell: "simple_qwen3.5-397b_canon", run: 0, turn: 15, title: "Where the winning trajectory leaves the optimal route",
    text: "Turn 15: the Slime Lord before the Bat. The episode still wins, at 2 HP instead of the optimum 13." },
  { cell: "tower_qwen3.5-397b_final11_resume_blue", run: 0, turn: "resume", title: "The tower run that reached the normal ending",
    text: "A stored run resumed on MT18 with blue keys for sale, played on to the Nether Demon King on MT21." },
];

export default function Home() {
  const r = getResults();
  const n = getEpisodes().episodes.length;
  const table = (prefix: string) => {
    const t = r.tables.find((x) => x.title.startsWith(prefix));
    return t ? `/results/#${t.id}` : "/results/";
  };
  const episodeLink = (cell: string, run: number, turn: number | "resume") => {
    const ep = getCell(cell)?.runs[run]?.episode;
    if (!ep) return null;
    const resumed = getEpisode(ep)?.resumedAfter;
    const t = turn === "resume" ? (resumed != null ? resumed + 1 : null) : turn;
    return `/episodes/${ep}/${t != null ? `?t=${t}` : ""}`;
  };
  const findings = [
    { v: "15 / 15", k: "simple-floor episodes won by Qwen3.5-397B with the engine's annotations, each at 2 HP (optimum 13)",
      href: "/results/simple_qwen3.5-397b_canon/", link: "the re-run cell" },
    { v: "0/5 → 10/10", k: "after two annotation lines that state both sides of a trade-off; same model, same prompt",
      href: table("Table 6.5"), link: "the repair sequence" },
    { v: "MT7 → MT18", k: "highest tower floor across three observation designs; a resumed run reached the normal ending on MT21",
      href: table("Table 6.13"), link: "the tower runs" },
    { v: "1 / 70", k: "simple-floor wins with committed plans, against 14 of 20 for reactive play",
      href: table("Tables 6.9"), link: "the planning study" },
  ];
  const featured = FEATURED.map((f) => ({ ...f, href: episodeLink(f.cell, f.run, f.turn) })).filter((f) => f.href);
  const firstDecision = featured[0]?.href;

  return (
    <div className="page">
      <section className="hero flex flex-col gap-4">
        <span className="eyebrow">{SITE.degree} · {SITE.university}</span>
        <h1 className="text-[30px] max-w-[46ch]">{SITE.title}</h1>
        <p className="muted">{SITE.author} · supervised by {SITE.supervisors.join(" and ")} · <span className="tag tag-warn">{SITE.status}</span></p>
        <p className="lead">
          A language model plays Magic Tower, a deterministic game decided by the order of fights, doors and items. A deterministic engine
          lists the legal actions with their exact costs, the model chooses one, and an exact solver knows each floor&apos;s optimum.
          This site holds the evidence: every result file, every episode with the model&apos;s reasoning at each turn, and the route from
          the first experiments to the final configuration.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href="/tour/"><IconCompass aria-hidden="true" />Take the guided tour</Link>
          {firstDecision && <Link className="btn" href={firstDecision}><IconReplay aria-hidden="true" />Start with the first decision</Link>}
          <Link className="btn" href="/results/"><IconTable aria-hidden="true" />Browse the results</Link>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="findings">
        <h2 id="findings">Main findings</h2>
        <div className="kpis">
          {findings.map((f) => (
            <div key={f.v} className="kpi">
              <span className="v">{f.v}</span>
              <span className="k">{f.k}</span>
              <Link className="link" href={f.href}>{f.link}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="start">
        <h2 id="start">Start here</h2>
        <div className="card-grid">
          {featured.map((f) => (
            <Link key={f.title} className="card-link" href={f.href!}>
              <span className="card-icon"><IconCompass aria-hidden="true" /></span>
              <span className="heading text-[15px]">{f.title}</span>
              <span className="muted">{f.text}</span>
              <span className="go">open the replay <IconChevronRight aria-hidden="true" className="inline" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="evidence">
        <h2 id="evidence">The evidence</h2>
        <div className="card-grid">
          <Link className="card-link" href="/results/">
            <span className="card-icon"><IconTable aria-hidden="true" /></span>
            <span className="heading text-[15px]">Results</span>
            <span className="muted">{r.cells.filter((c) => c.thesis).length} cells behind the thesis tables, each with its settings, episodes and the command that re-runs it.</span>
            <span className="go">browse by thesis table</span>
          </Link>
          <Link className="card-link" href="/episodes/">
            <span className="card-icon"><IconReplay aria-hidden="true" /></span>
            <span className="heading text-[15px]">Episodes</span>
            <span className="muted">{n.toLocaleString("en")} replays: the map, the observation, the reasoning and the answer at every turn.</span>
            <span className="go">filter by floor, model, outcome</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
