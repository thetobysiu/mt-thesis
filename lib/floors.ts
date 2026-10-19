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

export const FLOOR_ORDER = ["simple", "hand01", "hand02", "hand03", "hand04", "complex"];
export const floorRank = (id: string) => {
  const i = FLOOR_ORDER.indexOf(id);
  return i >= 0 ? i : 100 + Number(id.replace(/\D/g, ""));
};
