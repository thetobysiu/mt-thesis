// Copies the 21 single floors from mt-ai-lab into public/data/floors and records the Java solver's answers for each
// (the exact solver, and the published solver's first-popped search), which tests/solver.test.ts holds the TS port to.
//
//   MT_AI_LAB=D:/Projects/mt-ai-lab npx tsx scripts/build-floors.ts      (needs java on PATH)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFloor } from "../lib/engine/floor";
import type { FloorEntry } from "../lib/data-types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAB = path.resolve(ROOT, process.env.MT_AI_LAB ?? "../mt-ai-lab");
const OUT = path.join(ROOT, "public", "data", "floors");
const CLASSES = path.join(LAB, "tools", "java_bfs", "out");

const sources: [string, FloorEntry["kind"], string][] = [
  ["simple", "simple", "data/floors/simple.txt"],
  ["complex", "complex", "data/floors/complex.txt"],
  ...[1, 2, 3, 4].map((i): [string, FloorEntry["kind"], string] => [`hand0${i}`, "hand", `data/floors/hand/hand0${i}.txt`]),
  ...Array.from({ length: 15 }, (_, i): [string, FloorEntry["kind"], string] => {
    const id = `gen${String(i + 1).padStart(2, "0")}`;
    return [id, "gen", `data/floors/gen/${id}.txt`];
  }),
];

function java(args: string[], input: string): string {
  return execFileSync("java", ["-Xss64m", "-cp", CLASSES, "Main", ...args], { input, encoding: "utf8", maxBuffer: 1 << 30 });
}

function exact(text: string): FloorEntry["exact"] {
  const out = java(["--summary", "--quiet"], text);
  const m = /RESULT solvable=(\w+) hp=(-?\d+) atk=(-?\d+) def=(-?\d+) mdef=(-?\d+) keys=(-?\d+),(-?\d+),(-?\d+) states=(\d+) wins=(\d+) optimal=(\d+) stops=(\d+) nodes=(\d+) hashed=(\d+) decisions=(-?\d+)/.exec(out);
  if (!m) throw new Error(`no RESULT line:\n${out.slice(0, 500)}`);
  const n = (k: number) => Number(m[k]);
  return { solvable: m[1] === "true", hp: n(2), atk: n(3), def: n(4), states: n(9), winningSets: n(10), optimalSets: n(11),
           nodes: n(13), hashed: n(14), decisions: n(15) };
}

function published(text: string): FloorEntry["published"] {
  const out = java([], text);
  const m = /------ BEST SOLUTION \(HP=(-?\d+)\) ------/.exec(out);
  const states = /cnt: (\d+); solutions: (\d+)/.exec(out);
  return { hp: m ? Number(m[1]) : null, states: states ? Number(states[1]) : null };
}

fs.mkdirSync(OUT, { recursive: true });
const entries: FloorEntry[] = [];
for (const [id, kind, rel] of sources) {
  const text = fs.readFileSync(path.join(LAB, rel), "utf8");
  const f = parseFloor(id, text);
  fs.writeFileSync(path.join(OUT, `${id}.txt`), text);
  const t0 = Date.now();
  const entry: FloorEntry = { id, kind, width: f.width, height: f.height, exact: exact(text), published: published(text) };
  entries.push(entry);
  console.log(`${id.padEnd(8)} exact ${entry.exact.solvable ? entry.exact.hp : "unsolvable"} · published ${entry.published.hp ?? "none"} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ generated: new Date().toISOString(), source: "mt-ai-lab tools/java_bfs", floors: entries }, null, 1));
