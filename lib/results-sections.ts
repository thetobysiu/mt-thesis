// Result groups (Appendix D, Table D.4) placed under the Chapter 6 section that reports them, in table order.
import type { TableSummary } from "./data-types";

export const RESULT_SECTIONS = [
  { id: "6.1", title: "Setup and final configuration" },
  { id: "6.2", title: "Main results" },
  { id: "6.3", title: "Ablations" },
  { id: "6.4", title: "Error analysis" },
  { id: "6.5", title: "Prompt optimisation (RQ2)" },
  { id: "6.6", title: "Planning horizon (RQ3)" },
  { id: "6.7", title: "Hand-designed floors, generated floors and the tower" },
  { id: "fig", title: "Figures" },
] as const;

// Subsection that holds each Chapter 6 table
const TABLE_AT: Record<number, string> = {
  1: "6.1.1", 2: "6.2", 3: "6.3", 4: "6.3", 5: "6.4.3", 6: "6.5.2", 7: "6.5.2", 8: "6.5.3", 9: "6.6", 10: "6.6", 11: "6.7.1", 12: "6.7.2", 13: "6.7.3",
};
const tableNo = (title: string) => Number(/Tables? 6\.(\d+)/.exec(title)?.[1] ?? 99);
const subsectionOf = (title: string) => /Section (6(?:\.\d+)+)/.exec(title)?.[1] ?? TABLE_AT[tableNo(title)] ?? "9";
const cmpSection = (a: string, b: string) => {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

export function sectionOf(title: string): string {
  if (/^Figures\b/.test(title)) return "fig";
  const sub = subsectionOf(title);
  return sub === "9" ? "fig" : sub.split(".").slice(0, 2).join(".");
}

/** Sections in thesis order, each with its groups in subsection and table order (ties keep Appendix D order). */
export function groupBySection(tables: TableSummary[]) {
  return RESULT_SECTIONS.map((s) => ({
    ...s,
    tables: tables.map((t, i) => ({ t, i, sub: subsectionOf(t.title), no: tableNo(t.title) })).filter(({ t }) => sectionOf(t.title) === s.id)
      .sort((a, b) => cmpSection(a.sub, b.sub) || a.no - b.no || a.i - b.i).map(({ t }) => t),
  })).filter((s) => s.tables.length > 0);
}
