// Types and constants shared by the build-time presentation data (lib/present-data.ts, server-only) and the client slides.
import type { FloorSolution } from "./data-types";
import type { FlipAction } from "@/components/demos/AnnotationFlip";
import type { FloorRow, RateRow } from "@/components/tour/Bars";
import type { Divergence } from "./tour-data";

export type GridRun = { id: string; won: boolean; turn: number };
export type GridCell = { label: string; k: number; n: number; died: number; ratio: number | null; runs: GridRun[] };
export type FloorFacts = { text: string; solution: FloorSolution; optimum: number; published: number | null; states: number; sets: number };
export type Pick = { id: string; turn: number } | null;

export type PresentData = {
  simple: FloorFacts;
  complex: FloorFacts;
  picks: {
    firstDecision: Pick; turn9Before: Pick; turn9After: Pick; orderLine35: Pick;
    complexLoss: Pick; exactRoute: Pick; hand01: Pick; routeWin: Pick;
  };
  flip: { actions: FlipAction[]; choseOne: string; choseTwo: string } | null;
  grid: Record<string, GridCell>;
  repair: RateRow[];
  depth: RateRow[];
  tower: FloorRow[];
  divergence: Divergence | null;
  tables: Record<string, string>;
};

export const MODELS = ["qwen3.5-397b", "deepseek-v4-flash", "qwen3.6-35b", "mistral-medium-3.5"];
export const MODEL_NAMES: Record<string, string> = {
  "qwen3.5-397b": "Qwen3.5-397B", "deepseek-v4-flash": "DeepSeek-V4-Flash", "qwen3.6-35b": "Qwen3.6-35B", "mistral-medium-3.5": "Mistral Medium 3.5",
};
export const GRID_FLOORS: { id: string; title: string; cell: (m: string) => string }[] = [
  { id: "simple", title: "Simple", cell: (m) => `simple_${m}_canon` },
  { id: "complex", title: "Complex\nsingle-floor prompt", cell: (m) => `complex_${m}_canon` },
  { id: "complex-route", title: "Complex\nsolver-route prompt", cell: (m) => `complex_route_${m}_canon` },
  { id: "hand01", title: "hand01", cell: (m) => `hand01_${m}_canon` },
  { id: "hand02", title: "hand02", cell: (m) => `hand02_${m}_canon` },
  { id: "hand03", title: "hand03", cell: (m) => `hand03_${m}_canon` },
  { id: "hand04", title: "hand04", cell: (m) => `hand04_${m}_canon` },
];
