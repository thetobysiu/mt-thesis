// Build-time access to the generated data (server components only).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { CellSummary, EpisodeEntry, EpisodeIndex, EpisodeValues, FloorEntry, FloorSolution, ResultsIndex, TowerFloors } from "./data-types";
import type { RunLog } from "./types";

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

let floors: FloorEntry[] | null = null;
export function getFloors(): FloorEntry[] {
  floors ??= (JSON.parse(fs.readFileSync(path.join(DATA, "floors", "index.json"), "utf8")) as { floors: FloorEntry[] }).floors;
  return floors;
}

export function getFloorText(id: string): string {
  return fs.readFileSync(path.join(DATA, "floors", `${id}.txt`), "utf8");
}

export function getSolution(id: string): FloorSolution {
  return JSON.parse(fs.readFileSync(path.join(DATA, "floors", `${id}.solution.json`), "utf8")) as FloorSolution;
}

/** A stored episode log, decompressed at build time. */
export function readEpisodeLog(id: string): RunLog {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA, "episodes", `${id}.json.gz`))).toString("utf8")) as RunLog;
}

/** Precomputed state values of an episode (single floors), or null. */
export function readEpisodeValues(id: string): EpisodeValues | null {
  const f = path.join(DATA, "values", `${id}.json`);
  return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as EpisodeValues) : null;
}

/** Episodes of a cell in run order. */
export function cellEpisodes(label: string): EpisodeEntry[] {
  const cell = getCell(label);
  if (!cell) return [];
  return cell.runs.map((r) => (r.episode ? getEpisode(r.episode) : undefined)).filter((e): e is EpisodeEntry => !!e);
}

let tower: TowerFloors | null = null;
export function getTowerFloors(): TowerFloors {
  tower ??= JSON.parse(fs.readFileSync(path.join(DATA, "tower", "floors.json"), "utf8")) as TowerFloors;
  return tower;
}
