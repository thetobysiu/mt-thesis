// Build-time access to the generated data (server components only).
import fs from "node:fs";
import path from "node:path";
import type { CellSummary, EpisodeEntry, EpisodeIndex, ResultsIndex } from "./data-types";

const DATA = path.join(process.cwd(), "public", "data");
let results: ResultsIndex | null = null;
let episodes: EpisodeIndex | null = null;

export function getResults(): ResultsIndex {
  results ??= JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf8")) as ResultsIndex;
  return results;
}

export function getEpisodes(): EpisodeIndex {
  episodes ??= JSON.parse(fs.readFileSync(path.join(DATA, "episodes.json"), "utf8")) as EpisodeIndex;
  return episodes;
}

export function getCell(label: string): CellSummary | undefined {
  return getResults().cells.find((c) => c.label === label);
}

export function getEpisode(id: string): EpisodeEntry | undefined {
  return getEpisodes().episodes.find((e) => e.id === id);
}
