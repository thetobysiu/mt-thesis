import type { Metadata } from "next";
import { CompareView, type ComparePreset } from "@/components/CompareView";
import { getEpisodes, getFloors } from "@/lib/data";
import { modelName, scenarioName } from "@/lib/format";

export const metadata: Metadata = {
  title: "Compare two episodes",
  description: "Two episodes of the same floor side by side, opened at the first turn where they act differently.",
};

// cells where the same configuration both won and lost: the comparison shows where the losing episode left the winning one
const PRESET_CELLS: { label: string; note: string }[] = [
  { label: "simple_qwen3.5-397b_basic_k1k2_hist0", note: "same prompt and engine, no conversation history" },
  { label: "simple_qwen3.6-35b_final2_la3", note: "the smaller model on the final configuration" },
  { label: "simple_qwen3.5-397b_final2_la2", note: "lookahead depth 2 instead of 3" },
  { label: "hand01_deepseek-v4-flash_final2", note: "a hand-built floor with one winning set" },
];

export default function ComparePage() {
  const episodes = getEpisodes().episodes;
  const presets: ComparePreset[] = [];
  for (const p of PRESET_CELLS) {
    const eps = episodes.filter((e) => e.cells.some((c) => c.label === p.label))
      .sort((x, y) => (x.started ?? "").localeCompare(y.started ?? ""));
    const won = eps.find((e) => e.success), lost = eps.find((e) => !e.success);
    if (!won || !lost) continue;
    presets.push({ a: won.id, b: lost.id, title: `${scenarioName(won.floor)} · ${modelName(won.model)}`, note: `A won, B did not: ${p.note}` });
  }
  return (
    <div className="page page-wide">
      <section className="flex flex-col gap-3 max-w-[90ch]">
        <span className="eyebrow">Evidence</span>
        <h1>Compare two episodes</h1>
        <p className="lead">
          The same floor, two episodes, one turn counter. The page opens at the first turn where the two act differently and shows what
          each model saw and reasoned there. On single floors with exact values, the best final HP still reachable is shown after every turn.
        </p>
      </section>
      <CompareView presets={presets} valueFloors={getFloors().map((f) => f.id)} />
    </div>
  );
}
