// The published data must not leak local paths or keys, and every index entry must point at a file that exists.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import type { EpisodeIndex, ResultsIndex } from "@/lib/data-types";

const DATA = path.join(__dirname, "..", "public", "data");
const read = <T,>(rel: string) => JSON.parse(fs.readFileSync(path.join(DATA, rel), "utf8")) as T;
const LEAKS: [string, RegExp][] = [
  ["Windows path", /\b[A-Za-z]:(?:\\\\|\/)[A-Za-z0-9_.-]+(?:\\\\|\/)/],
  ["home directory", /\/(?:home|Users)\/[A-Za-z0-9_.-]+\//],
  ["API key", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9._-]{20,}/],
  ["key field", /"[A-Za-z_]*(?:API_KEY|api_key|SECRET|secret|PASSWORD|password)[A-Za-z_]*"\s*:\s*"/],
];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

describe("public data", () => {
  it("contains no local paths, user directories or keys", () => {
    const found: string[] = [];
    for (const f of files(DATA)) {
      const buf = fs.readFileSync(f);
      const text = f.endsWith(".gz") ? zlib.gunzipSync(buf).toString("utf8") : buf.toString("utf8");
      for (const [what, re] of LEAKS) {
        const m = re.exec(text);
        if (m) found.push(`${path.relative(DATA, f)}: ${what} near "${text.slice(Math.max(0, m.index - 20), m.index + 40)}"`);
      }
    }
    expect(found).toEqual([]);
  });

  it("has a compacted log for every catalogued episode and every cell run that names one", () => {
    const { episodes } = read<EpisodeIndex>("episodes.json");
    const ids = new Set(episodes.map((e) => e.id));
    for (const e of episodes) expect(fs.existsSync(path.join(DATA, "episodes", `${e.id}.json.gz`)), e.id).toBe(true);
    const { cells, tables } = read<ResultsIndex>("index.json");
    const labels = new Set(cells.map((c) => c.label));
    for (const c of cells) {
      expect(fs.existsSync(path.join(DATA, c.file)), c.file).toBe(true);
      for (const r of c.runs) if (r.episode) expect(ids.has(r.episode), `${c.label} -> ${r.episode}`).toBe(true);
    }
    for (const t of tables) for (const it of t.items) {
      if (it.isCell) expect(labels.has(it.label), it.label).toBe(true);
      expect(fs.existsSync(path.join(DATA, it.path)), it.path).toBe(true);
    }
  });
});
