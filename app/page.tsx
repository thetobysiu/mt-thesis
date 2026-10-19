import Link from "next/link";
import { IconBook, IconChevronRight, IconCompare, IconCompass, IconDna, IconGamepad, IconReplay, IconRoute, IconTable, IconTarget, IconTower } from "@/components/Icons";
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
        <h2 id="evidence">Explore</h2>
        <div className="card-grid">
          {[
            { href: "/tour/", icon: IconCompass, title: "Guided tour", text: "Eleven short chapters from the game to the conclusion, each with something to try.", go: "start the tour" },
            { href: "/journey/", icon: IconRoute, title: "Journey", text: "From single scored episodes to the final configuration, with the readings that did not survive.", go: "26 milestones" },
            { href: "/results/", icon: IconTable, title: "Results", text: `${r.cells.filter((c) => c.thesis).length} cells behind the thesis tables, each with its settings, episodes and the command that re-runs it.`, go: "browse by thesis table" },
            { href: "/episodes/", icon: IconReplay, title: "Episodes", text: `${n.toLocaleString("en")} replays: the map, the observation, the reasoning and the answer at every turn.`, go: "filter by floor, model, outcome" },
            { href: "/compare/", icon: IconCompare, title: "Compare", text: "A win and a loss side by side, opened at the first turn where they act differently.", go: "compare two episodes" },
            { href: "/solver/", icon: IconTarget, title: "Exact solver", text: "The search that gives every floor its optimum, step by step, and why the published one reported 22 instead of 68.", go: "step through the search" },
            { href: "/prompt-optimisation/", icon: IconDna, title: "Prompt optimisation", text: "Every evolved prompt, the teacher's diagnosis, the validator's verdict and the held-out result.", go: "candidate by candidate" },
            { href: "/play/", icon: IconGamepad, title: "Play", text: "Any single floor on the thesis engine, with the exact solver's value of every action.", go: "play a floor" },
            { href: "/tower/", icon: IconTower, title: "Tower Game", text: "The original 24-floor game in English, in the browser, and every tower run with the highest floor it reached.", go: "play the tower" },
            { href: "/thesis/", icon: IconBook, title: "Thesis", text: "The full text with linked references, the result cells behind each table, and the PDF.", go: "read the thesis" },
          ].map((c) => (
            <Link key={c.href} className="card-link" href={c.href}>
              <span className="card-icon"><c.icon aria-hidden="true" /></span>
              <span className="heading text-[15px]">{c.title}</span>
              <span className="muted">{c.text}</span>
              <span className="go">{c.go}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
