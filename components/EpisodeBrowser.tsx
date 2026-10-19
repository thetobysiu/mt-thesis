"use client";
// Filterable list of every stored episode and tower run (public/data/episodes.json).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Outcome } from "./Outcome";
import type { EpisodeEntry, EpisodeIndex } from "@/lib/data-types";
import { modelName, pct, scenarioName } from "@/lib/format";

const PAGE = 100;
type OutcomeFilter = "all" | "won" | "not-won" | "died";

const floorOrder = (f: string) => {
  const fixed = ["simple", "complex", "hand01", "hand02", "hand03", "hand04"];
  const i = fixed.indexOf(f);
  return i >= 0 ? `0${i}` : f.startsWith("gen") ? `1${f}` : `2${f}`;
};

export function EpisodeBrowser() {
  const [data, setData] = useState<EpisodeEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [floor, setFloor] = useState("simple");
  const [model, setModel] = useState("all");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    fetch("/data/episodes.json").then((r) => r.json() as Promise<EpisodeIndex>).then((d) => {
      const f = new URLSearchParams(window.location.search).get("floor");
      if (f) setFloor(f);
      setData(d.episodes);
    }).catch((e: unknown) => setError(String(e)));
  }, []);
  const floors = useMemo(() => [...new Set((data ?? []).map((e) => e.floor))].sort((a, b) => floorOrder(a).localeCompare(floorOrder(b))), [data]);
  const models = useMemo(() => [...new Set((data ?? []).map((e) => modelName(e.model)))].sort(), [data]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((e) =>
      (floor === "all" || e.floor === floor) &&
      (model === "all" || modelName(e.model) === model) &&
      (outcome === "all" || (outcome === "won" ? e.success === true : outcome === "died" ? e.died : e.success !== true && !e.died)) &&
      (!needle || e.id.toLowerCase().includes(needle) || e.cells.some((c) => c.label.toLowerCase().includes(needle))),
    ).sort((a, b) => (b.started ?? "").localeCompare(a.started ?? ""));
  }, [data, floor, model, outcome, q]);
  const shown = rows.slice(page * PAGE, (page + 1) * PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const set = <T,>(f: (v: T) => void) => (v: T) => { f(v); setPage(0); };

  if (error) return <p className="text-[var(--bad)]">Could not load the episode list: {error}</p>;
  if (!data) return <p className="muted">Loading the episode list…</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="search">
        <select className="input" value={floor} onChange={(e) => set(setFloor)(e.target.value)} aria-label="floor">
          <option value="all">all floors</option>
          {floors.map((f) => <option key={f} value={f}>{scenarioName(f)}</option>)}
        </select>
        <select className="input" value={model} onChange={(e) => set(setModel)(e.target.value)} aria-label="model">
          <option value="all">all models</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="input" value={outcome} onChange={(e) => set(setOutcome)(e.target.value as OutcomeFilter)} aria-label="outcome">
          <option value="all">any outcome</option><option value="won">won</option><option value="not-won">alive, not won</option><option value="died">died</option>
        </select>
        <input className="input min-w-[220px]" value={q} onChange={(e) => set(setQ)(e.target.value)} placeholder="cell label or log name" aria-label="filter by cell or log name" />
        <span className="muted text-[12px] ml-auto">{rows.length} of {data.length}</span>
      </div>
      <div className="widget scroll-x">
        <table className="tbl">
          <thead><tr>
            <th>date</th><th>floor</th><th>model</th><th>outcome</th><th className="num">HP / opt</th><th className="num">turns</th>
            <th className="num">decisions</th><th>cell</th>
          </tr></thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td className="mono"><Link className="link" href={`/episodes/${e.id}/`}>{(e.started ?? e.id).slice(0, 16).replace("T", " ")}</Link></td>
                <td>{scenarioName(e.floor)}</td>
                <td>{modelName(e.model)}</td>
                <td><Outcome e={e} /></td>
                <td className="num">{pct(e.hpRatio)}</td>
                <td className="num">{e.turns}</td>
                <td className="num">{e.decisions}</td>
                <td className="mono text-[12px]">{e.cells[0]?.label ?? ""}{e.cells.length > 1 ? ` +${e.cells.length - 1}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>previous</button>
          <span className="muted text-[12px]">page {page + 1} of {pages}</span>
          <button className="btn btn-sm" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}>next</button>
        </div>
      )}
    </div>
  );
}
