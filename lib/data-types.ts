// Shapes of the generated files in public/data (written by scripts/build-data.ts).

export type EpisodeEntry = {
  id: string;                 // run-log file name without .json
  floor: string;              // single floor id, or MTa-MTb for a tower run
  tower: boolean;
  mode: string;               // llm | heuristic | …
  model: string | null;
  started: string | null;
  turns: number;              // executed turns, assisted turns included
  decisions: number;          // turns chosen by the model
  success: boolean | null;
  died: boolean;
  finalHp: number | null;
  hpRatio: number | null;     // final HP / exact optimum (successes)
  maxFloor: string | null;    // tower: highest floor reached
  hasResult: boolean;
  kb: number;                 // compacted, gzipped size
  resumedAfter: number | null; // resumed run: last turn repeated from the stored run
  cells: { label: string; file: string; run: number | null }[];
};

export type EpisodeIndex = { generated: string; episodes: EpisodeEntry[] };

export type CellRun = {
  run: number | null; episode: string | null; success: boolean | null; died: boolean;
  finalHp: number | null; hpRatio: number | null; steps: number | null; llmCalls: number | null; maxFloor: string | null;
};

export type CellSummary = {
  label: string; file: string; thesis: boolean; tables: string[];
  scenario: string; tower: boolean;
  model: string | null; preset: string | null; mode: string | null; taskMode: string | null;
  prompt: string | null; temperature: number | null; lookahead: number | null; overridesOff: boolean; checkpoint: number | null;
  env: Record<string, string>; updated: string | null;
  n: number; successes: number | null; ci: [number, number] | null; hpRatio: number | null; died: number | null;
  finalHpMean: number | null; floorsMax: number | null; secondsPerCall: number | null; parseErrorRate: number | null;
  runs: CellRun[];
  rerun: string[];            // mt-ai-lab registry codes that write this result file
};

export type TableSummary = {
  id: string; title: string; files: string;
  items: { label: string; path: string; kind: string; isCell: boolean }[];
};

export type ResultsIndex = {
  generated: string;
  source: { repo: string; version: string | null };
  thesisSource: string;
  tables: TableSummary[];
  cells: CellSummary[];
  catalog: { id: string; section: string; title: string; codes: string[] }[];
};

/** public/data/floors/index.json: the single floors and the Java solver's answers. */
export type FloorEntry = {
  id: string; kind: "simple" | "complex" | "hand" | "gen"; width: number; height: number;
  exact: { solvable: boolean; hp: number; atk: number; def: number; states: number; winningSets: number; optimalSets: number;
           nodes: number; hashed: number; decisions: number };
  published: { hp: number | null; states: number | null };
};

export type RouteStepData = { kind: "start" | "decision" | "auto"; tiles: { x: number; y: number }[]; hp: number; atk: number; def: number; keys: number[] };
export type SolutionData = { hp: number | null; solvable: boolean; states: number; winningSets: number; route: RouteStepData[] };
/** public/data/floors/<id>.solution.json */
export type FloorSolution = { id: string; exact: SolutionData; published: SolutionData };
/** public/data/values/<episode>.json */
export type EpisodeValues = { id: string; floor: string; optimum: number | null; values: { turn: number; value: number | null }[] };
