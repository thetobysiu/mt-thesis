// What each single floor is, in the thesis's words (Chapter 4 and Appendix B).
import type { FloorEntry } from "./data-types";

/** Floors whose exact search takes minutes and much memory: never searched in the browser. */
export const HEAVY = new Set(["complex", "hand03"]);

export function floorTitle(id: string): string {
  if (id === "simple") return "Simple floor";
  if (id === "complex") return "Complex floor";
  return id;
}

export function floorBlurb(f: Pick<FloorEntry, "id" | "kind">): string {
  if (f.id === "simple") return "The 11 × 11 boss floor of the published solver's test maps: the floor the observation was developed on, and the thesis's running example.";
  if (f.id === "complex") return "The published solver's second test map: a long order of doors and fights. The published solver reports 22 HP; the exact solver finds 68.";
  if (f.kind === "hand") return "Hand-designed for the thesis: exactly one set of monsters and doors wins, and the rule-based heuristic and random play fail.";
  if (f.id === "gen01" || f.id === "gen02") return "Generated boss floor, checked by the exact solver; a training floor of the prompt-optimisation study.";
  return "Generated boss floor, checked by the exact solver; held out: no prompt or annotation was developed on it.";
}

export const FLOOR_ORDER = ["simple", "complex", "hand01", "hand02", "hand03", "hand04"];
/** simple, complex, hand01–04, gen01–15, then tower scenarios by their first floor. */
export const floorRank = (id: string) => {
  const plain = id.replace(/\.txt$/, "");
  const i = FLOOR_ORDER.indexOf(plain);
  if (i >= 0) return i;
  const mt = /^MT(\d+)/.exec(plain);
  if (mt) return 1000 + Number(mt[1]) * 10 + (plain.includes("-") ? 5 : 0);
  return 100 + Number(plain.replace(/\D/g, ""));
};

/** Tower floor ids in climbing order (MT23 has three wings). */
export const TOWER_FLOORS = [...Array.from({ length: 23 }, (_, i) => `MT${i}`), "MT23w", "MT23e", "MT23s"];
export const towerIndex = (id: string | null | undefined) => (id ? TOWER_FLOORS.indexOf(id) : -1);
export function towerFloorTitle(id: string): string {
  const m = /^MT(\d+)([wes]?)$/.exec(id);
  if (!m) return id;
  return `Floor ${m[1]}${m[2] ? `, ${({ w: "west", e: "east", s: "south" } as Record<string, string>)[m[2]]} wing` : ""}`;
}

/** Which tower observation (Table 6.13) and planning mode a tower cell ran with. */
export function towerRunLabel(cell: string): string {
  const obs = cell.includes("_resume") ? "resumed on MT18" : cell.includes("final11") ? "final observation"
    : cell.includes("final3") ? "second observation" : cell.includes("final2") ? "first observation" : "";
  const plan = /_plan(\d+)/.exec(cell)?.[1];
  const mode = plan ? `, ${plan}-step plans` : cell.includes("maxsteps_once") ? ", one plan without re-planning" : cell.includes("maxsteps") ? ", plans as long as possible" : "";
  return obs + mode;
}

/** What the thesis and the tower runs say about a tower floor. */
export const TOWER_NOTES: Record<string, string> = {
  MT0: "The start. The fairy's keys are given at the start, as in the thesis engine.",
  MT2: "Old men here give items; the engine treats them as items to collect.",
  MT3: "The gold shop: spend gold on HP, ATK or DEF.",
  MT4: "The thief's scripted event.",
  MT5: "The experience shop (an old man) and a key merchant.",
  MT8: "The Red Bats here stopped the heuristic and every run of the second tower observation.",
  MT10: "The arrival area is closed by ice, which opens without a key.",
  MT11: "The second gold shop.",
  MT12: "A merchant who buys keys.",
  MT13: "The second experience shop.",
  MT15: "Two trades: a sword for 500 EXP and a shield for 500 gold.",
  MT16: "The Red Demon King needs ATK above 1,000.",
  MT17: "Upgraded monsters stopped two final-observation runs of DeepSeek-V4-Flash here.",
  MT18: "The best final-observation run stopped here with no blue key left; the resumed runs start here.",
  MT21: "The Nether Demon King. Defeating him is the normal ending, reached by a run resumed on MT18.",
};
