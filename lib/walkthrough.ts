// The 3-minute walkthrough as data: chapters, the captions (= the voice-over script) and the pause-and-try moments.
// Scenes are pure functions of the time t (components/walkthrough/Scenes.tsx), so the same timeline drives the player,
// the frame capture of the video (scripts/capture-walkthrough.ts), the WebVTT captions and the voice-over text.

export const DURATION = 180;

export type Chapter = { id: string; title: string; start: number; end: number };
export type Cue = { start: number; end: number; text: string };
export type TryPoint = { id: string; at: number; until: number; label: string; demo: "damage" | "decision" | "solver" | "flip" | "complex" | "site" };

export const CHAPTERS: Chapter[] = [
  { id: "question", title: "The question", start: 0, end: 12 },
  { id: "game", title: "Magic Tower", start: 12, end: 30 },
  { id: "decision", title: "One decision", start: 30, end: 50 },
  { id: "agent", title: "The hybrid agent and the exact solver", start: 50, end: 70 },
  { id: "observation", title: "RQ1 · The observation", start: 70, end: 95 },
  { id: "boundary", title: "Two warnings and the boundary", start: 95, end: 110 },
  { id: "prompt", title: "RQ2 · Prompt optimisation", start: 110, end: 128 },
  { id: "planning", title: "RQ3 · The planning horizon", start: 128, end: 145 },
  { id: "tower", title: "The 24-floor tower", start: 145, end: 160 },
  { id: "takeaways", title: "Takeaways and this site", start: 160, end: 180 },
];

export const CUES: Cue[] = [
  { start: 0.4, end: 5.6, text: "Can a language model plan a route of seventeen decisions, when a single wrong one loses the floor?" },
  { start: 5.8, end: 11.8, text: "This thesis tests that in Magic Tower, a puzzle game with no randomness and no undo." },
  { start: 12.2, end: 18.8, text: "Every fight costs HP by one formula: attack lowers the number of strikes, defence lowers every strike." },
  { start: 19.0, end: 24.8, text: "So order matters: a gem taken before a fight saves more than its face value." },
  { start: 25.0, end: 29.8, text: "And nothing comes back: keys, HP and monsters are gone once used." },
  { start: 30.2, end: 36.8, text: "Here is the first decision on the simple floor. Four actions are legal." },
  { start: 37.0, end: 43.8, text: "The exact solver shows that only one, the Black Slime, still leaves a win. The other three have already lost the floor, though nothing shows it yet." },
  { start: 44.0, end: 49.8, text: "In the re-run, nineteen of twenty episodes chose it." },
  { start: 50.2, end: 57.8, text: "The agent splits the work: the engine computes reachability, exact damage and a lookahead; the model only picks a numbered action." },
  { start: 58.0, end: 64.0, text: "An exact solver scores every state. It also corrected a published reference: the complex floor's optimum is 68 HP, not 22." },
  { start: 64.2, end: 69.8, text: "Question one: what does the engine's observation contribute?" },
  { start: 70.2, end: 77.8, text: "Failed episodes kept citing lines that showed only one side of a trade-off: a saving, without the HP it costs to get there." },
  { start: 78.0, end: 86.0, text: "Stating the missing side, with the model and the prompt unchanged, took the largest model from zero of five wins to ten of ten." },
  { start: 86.2, end: 94.8, text: "Across both runs it won fifteen of fifteen, though always at 2 HP, where the optimum is 13." },
  { start: 95.2, end: 102.8, text: "Two warnings. Every early win had contained a silent engine override; overrides are now mechanical only, and logged." },
  { start: 103.0, end: 109.8, text: "And on the complex floor no model wins: twenty-nine of thirty losses fall at one cheap fight, long before the door a human would blame." },
  { start: 110.2, end: 118.8, text: "Question two: does evolutionary prompt optimisation help? With the annotations present, its gains stay within the noise between two runs of one prompt." },
  { start: 119.0, end: 127.8, text: "With a reasoning model, both search loops raised their training score and lost on held-out floors: the population search won 24 of 39 games, the plain rules prompt 32." },
  { start: 128.2, end: 135.8, text: "Question three: react at every step, or commit to a plan?" },
  { start: 136.0, end: 144.8, text: "On the simple floor, reactive play won fourteen of twenty episodes; committed plans one of seventy. Plans match it with a fraction of the calls only when the order is given." },
  { start: 145.2, end: 152.8, text: "On the full 24-floor tower, the rule-based heuristic stops at floor 8. The best model reached floor 18." },
  { start: 153.0, end: 159.8, text: "Resumed there with blue keys for sale, as in the original game, it reached the normal ending." },
  { start: 160.2, end: 168.8, text: "The lesson: put strategic knowledge into the engine's observation, with both sides of every trade-off, not into the prompt." },
  { start: 169.0, end: 174.8, text: "Commit to a plan only when the order is known, and measure agents against an exact reference." },
  { start: 175.0, end: 179.6, text: "Every episode, table and search is on this site. Try them." },
];

export const TRIES: TryPoint[] = [
  { id: "damage", at: 18, until: 30, label: "Try the damage formula", demo: "damage" },
  { id: "decision", at: 31, until: 50, label: "Make the first decision yourself", demo: "decision" },
  { id: "solver", at: 58, until: 70, label: "Step the exact solver", demo: "solver" },
  { id: "flip", at: 72, until: 95, label: "Flip one-sided ↔ two-sided", demo: "flip" },
  { id: "complex", at: 103, until: 110, label: "Open the losing decision", demo: "complex" },
  { id: "site", at: 162, until: 180, label: "Open any part of the site", demo: "site" },
];

export const clampT = (t: number) => Math.max(0, Math.min(DURATION, t));
export const chapterAt = (t: number): Chapter => CHAPTERS.find((c) => t >= c.start && t < c.end) ?? CHAPTERS[CHAPTERS.length - 1];
export const cueAt = (t: number): Cue | null => CUES.find((c) => t >= c.start && t < c.end) ?? null;
export const tryAt = (t: number): TryPoint | null => TRIES.find((p) => t >= p.at && t < p.until) ?? null;

const vttTime = (s: number) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(r).padStart(3, "0")}`;
};

/** WebVTT captions for the video file (the player draws the same cues inside the canvas). */
export function captionsVtt(): string {
  return ["WEBVTT", "", ...CUES.flatMap((c, i) => [String(i + 1), `${vttTime(c.start)} --> ${vttTime(c.end)}`, c.text, ""])].join("\n");
}

/** The voice-over script: one paragraph per chapter, with its start time, to record over the music. */
export function voiceoverText(): string {
  const words = CUES.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
  const head = [
    "Magic Tower AI Lab: the thesis in three minutes. Voice-over script",
    `${words} words over ${DURATION} s (about ${Math.round(words / (DURATION / 60))} words per minute). Each line starts at the time shown; the captions use the same text.`,
    "",
  ];
  const body = CHAPTERS.flatMap((ch) => {
    const lines = CUES.filter((c) => c.start >= ch.start && c.start < ch.end);
    return [`[${vttTime(ch.start).slice(3, 8)}] ${ch.title}`, ...lines.map((c) => `  ${vttTime(c.start).slice(3, 10)}  ${c.text}`), ""];
  });
  return [...head, ...body].join("\n");
}
