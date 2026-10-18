// Builds public/data from an mt-ai-lab checkout (ADR 0003): compacted episode logs, the result files
// and the indexes the pages are generated from.
//
//   MT_AI_LAB=D:/Projects/mt-ai-lab MT_PYTHON=<python that can import mt-ai-lab> npm run data
//   optional: MT_SECRETS_ENV=<.env with the API keys>  -> the build fails if any key value appears in the output
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import type { CellSummary, EpisodeEntry, EpisodeIndex, ResultsIndex, TableSummary } from "../lib/data-types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAB = path.resolve(ROOT, process.env.MT_AI_LAB ?? "../mt-ai-lab");
const PYTHON = process.env.MT_PYTHON ?? "python";
const OUT = path.join(ROOT, "public", "data");

// ---------- scrubbing: no local paths, user names or keys leave this machine ----------
const DRIVE_PATH = /\b[A-Za-z]:[\\/](?:[^\\/\s"'<>|*?\n]+[\\/])*([^\\/\s"'<>|*?\n]*)/g;
const HOME_PATH = /\/(?:home|Users)\/[^/\s"']+\/(?:[^/\s"'\n]+\/)*([^/\s"'\n]*)/g;
const USER = os.userInfo().username;
const USER_RE = USER.length >= 4 ? new RegExp(USER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : null;
const SECRET_KEY = /api[_-]?key|secret|password|authorization/i;
const SECRET_VALUE = [/\bsk-[A-Za-z0-9_-]{20,}/, /\bBearer\s+[A-Za-z0-9._-]{20,}/];
const scrubStats = { paths: 0, user: 0, keys: 0 };
const scrubSamples = new Set<string>();

function loadSecrets(): string[] {
  const file = process.env.MT_SECRETS_ENV;
  if (!file) {
    console.warn("MT_SECRETS_ENV not set: the check against the real API key values is skipped");
    return [];
  }
  const values: string[] = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]*API_KEY[A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m) values.push(...m[2].replace(/^["']|["']$/g, "").split(",").map((v) => v.trim()).filter((v) => v.length >= 12));
  }
  return values;
}
const SECRETS = loadSecrets();

function scrubString(s: string): string {
  const hit = (m: string, base: string) => { scrubStats.paths++; if (scrubSamples.size < 25) scrubSamples.add(`${m} -> ${base}`); return base; };
  let out = s.replace(DRIVE_PATH, hit);
  out = out.replace(HOME_PATH, hit);
  if (USER_RE) out = out.replace(USER_RE, () => { scrubStats.user++; return "user"; });
  return out;
}

function scrub(v: unknown): unknown {
  if (typeof v === "string") return scrubString(v);
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      if (SECRET_KEY.test(k) && typeof val === "string") { scrubStats.keys++; continue; }
      o[scrubString(k)] = scrub(val);
    }
    return o;
  }
  return v;
}

function assertClean(text: string, where: string): void {
  for (const re of SECRET_VALUE) if (re.test(text)) throw new Error(`secret-like value in ${where} (${re})`);
  for (const s of SECRETS) if (text.includes(s)) throw new Error(`an API key value appears in ${where}`);
}

// ---------- helpers ----------
const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, "utf8"));
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function walkFiles(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walkFiles(path.join(dir, d.name), ext) : d.name.endsWith(ext) ? [path.join(dir, d.name)] : []);
}

function writeJson(rel: string, data: unknown): void {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const text = JSON.stringify(data);
  assertClean(text, rel);
  fs.writeFileSync(p, text);
}

function slug(s: string): string {
  return s.replace(/\$[^$]*\$/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/\./g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
}

const episodeId = (runLog: string) => path.basename(runLog).replace(/\.json$/, "");

// ---------- 1. result files ----------
type RunRef = { file: string; label: string; run: number | null };
const refs = new Map<string, RunRef[]>();
const resultFiles = walkFiles(path.join(LAB, "results"), ".json");
const reliability = new Map<string, { rel: string; data: Obj }>();
fs.rmSync(path.join(OUT, "results"), { recursive: true, force: true });

for (const file of resultFiles) {
  if (path.basename(file).startsWith("_")) continue;  // _check_* / _*_smoke: harness smoke tests, not experiments
  const rel = path.relative(LAB, file).split(path.sep).join("/");
  let data: unknown;
  try { data = readJson(file); } catch { console.warn("skip unreadable", rel); continue; }
  data = scrub(data);
  writeJson(rel, data);
  const label = path.basename(file, ".json");
  const walk = (o: unknown, runIdx: number | null) => {
    if (Array.isArray(o)) o.forEach((x) => walk(x, runIdx));
    else if (o && typeof o === "object") {
      const r = o as Obj;
      const idx = num(r.run_idx) ?? runIdx;
      if (typeof r.run_log === "string") {
        const id = episodeId(r.run_log);
        const list = refs.get(id) ?? [];
        if (!list.some((x) => x.file === rel && x.run === idx)) list.push({ file: rel, label, run: idx });
        refs.set(id, list);
      }
      for (const [k, v] of Object.entries(r)) if (k !== "run_log") walk(v, idx);
    }
  };
  walk(data, null);
  if (rel.startsWith("results/reliability/") && Array.isArray(obj(data).runs)) reliability.set(label, { rel, data: obj(data) });
}
console.log(`${resultFiles.length} result files, ${reliability.size} reliability cells, ${refs.size} referenced episodes`);

// ---------- 2. re-run commands from mt-ai-lab's catalog ----------
const PY_DUMP = `
import json, sys
sys.path.insert(0, ".")
from mota.harness import catalog as C
ex, env = C.registry()
labels = {}
for code, args in ex.items():
    if "--label" in args:
        labels.setdefault(args[args.index("--label") + 1], []).append(code)
print(json.dumps({"labels": labels, "catalog": [{"id": e["id"], "section": e["section"], "title": e["title"], "codes": e.get("codes", [])} for e in C.CATALOG]}))
`;
const registry = JSON.parse(execFileSync(PYTHON, ["-c", PY_DUMP], { cwd: LAB, encoding: "utf8", maxBuffer: 64 << 20 })) as {
  labels: Record<string, string[]>; catalog: { id: string; section: string; title: string; codes: string[] }[];
};

// ---------- 3. episodes ----------
const DROP = { turn: new Set(["llm_thinking", "state_text", "actions_text"]), thinking: new Set(["state_text", "actions_text"]),
               floor_change: new Set(["state_text"]) } as Record<string, Set<string>>;

function compact(log: Obj): Obj {
  const turns: Obj[] = [];
  for (const ev of (log.turns as Obj[] | undefined) ?? []) {
    const kind = String(ev.type);
    if (kind === "thinking_chunk") continue;
    const drop = DROP[kind];
    turns.push(drop ? Object.fromEntries(Object.entries(ev).filter(([k]) => !drop.has(k))) : ev);
  }
  const out: Obj = Object.fromEntries(Object.entries(log).filter(([k]) => k !== "turns"));
  const start = turns.find((t) => t.type === "start");
  if (start && out.runtime_prompt === start.runtime_system_prompt) delete out.runtime_prompt;
  out.turns = turns;
  return out;
}

function summarise(id: string, log: Obj, bytes: number): EpisodeEntry {
  const turns = ((log.turns as Obj[]) ?? []).filter((t) => t.type === "turn");
  const res = obj(log.result);
  const details = obj(res.details);
  const hero = obj(res.hero);
  const floor = String(log.floor_id ?? "");
  const finalHp = num(details.final_hp) ?? num(hero.hp) ?? num(obj(turns.at(-1)?.hero).hp);
  const replayed = turns.filter((t) => String(t.forced_reason ?? "").startsWith("resumed from")).map((t) => num(t.turn) ?? 0);
  return {
    id, floor, tower: /^MT\d+-MT/.test(floor) || Array.isArray(obj((log.turns as Obj[])?.[0]).floor_range),
    mode: str(log.mode) ?? "", model: str(log.task_model), started: str(log.started_at),
    turns: turns.length, decisions: turns.filter((t) => !t.forced).length,
    success: typeof res.success === "boolean" ? res.success : null,
    died: res.alive === false || (finalHp != null && finalHp <= 0),
    finalHp, hpRatio: num(res.hp_ratio), maxFloor: str(res.max_floor_id),
    hasResult: Object.keys(res).length > 0, kb: Math.round(bytes / 1024),
    resumedAfter: replayed.length ? Math.max(...replayed) : null,
    cells: (refs.get(id) ?? []).map((r) => ({ label: r.label, file: r.file, run: r.run })),
  };
}

fs.rmSync(path.join(OUT, "episodes"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "episodes"), { recursive: true });
const episodes: EpisodeEntry[] = [];
const missing: string[] = [];
let gzTotal = 0;
for (const id of [...refs.keys()].sort()) {
  const src = path.join(LAB, "logs", "runs", `${id}.json`);
  if (!fs.existsSync(src)) { missing.push(id); continue; }
  const log = scrub(compact(readJson(src) as Obj)) as Obj;
  const text = JSON.stringify(log);
  assertClean(text, `episode ${id}`);
  const gz = zlib.gzipSync(text, { level: 9 });
  fs.writeFileSync(path.join(OUT, "episodes", `${id}.json.gz`), gz);
  gzTotal += gz.length;
  episodes.push(summarise(id, log, gz.length));
  if (episodes.length % 200 === 0) console.log(`  ${episodes.length} episodes`);
}
console.log(`${episodes.length} episodes written (${(gzTotal / 2 ** 20).toFixed(1)} MB gz), ${missing.length} missing`);

// ---------- 4. thesis tables and cells ----------
const thesis = obj(readJson(path.join(LAB, "results", "thesis_index.json")));
const tables: TableSummary[] = [];
const citedBy = new Map<string, string[]>();
const usedSlugs = new Set<string>();
for (const row of (thesis.rows as Obj[]) ?? []) {
  const title = String(row.result ?? "");
  let id = slug(title) || `table-${tables.length + 1}`;
  while (usedSlugs.has(id)) id += "-b";
  usedSlugs.add(id);
  const items = ((row.items as Obj[]) ?? []).map((it) => {
    const label = String(it.label ?? path.basename(String(it.path), ".json"));
    if (reliability.has(label)) citedBy.set(label, [...(citedBy.get(label) ?? []), id]);
    return { label, path: String(it.path), kind: String(it.kind ?? "other"), isCell: reliability.has(label) };
  });
  tables.push({ id, title, files: String(row.files_cell ?? ""), items });
}

const byId = new Map(episodes.map((e) => [e.id, e]));
const cells: CellSummary[] = [];
for (const [label, { rel, data }] of reliability) {
  const cfg = obj(data.config);
  const agg = obj(data.aggregate);
  const env = obj(cfg.env);
  const runs = (data.runs as Obj[]).map((r) => {
    const id = typeof r.run_log === "string" ? episodeId(r.run_log) : null;
    return {
      run: num(r.run_idx), episode: id && byId.has(id) ? id : null, success: typeof r.success === "boolean" ? r.success : null,
      died: r.died === true, finalHp: num(r.final_hp), hpRatio: num(r.hp_ratio), steps: num(r.steps) ?? num(r.turns), llmCalls: num(r.llm_calls),
      maxFloor: str(r.max_floor_id) ?? str(r.final_floor_id),
    };
  });
  const ci = Array.isArray(agg.success_ci95) ? (agg.success_ci95 as number[]) : null;
  cells.push({
    label, file: rel, thesis: citedBy.has(label), tables: citedBy.get(label) ?? [],
    scenario: cfg.floor ? path.basename(String(cfg.floor)).replace(/\.txt$/, "") : cfg.start ? `${cfg.start}-${cfg.end ?? "MT23w"}` : "",
    tower: !cfg.floor && !!cfg.start,
    model: str(cfg.model), preset: str(cfg.preset), mode: str(cfg.mode), taskMode: str(cfg.task_mode),
    prompt: str(cfg.prompt_file), temperature: num(cfg.temperature), lookahead: num(cfg.lookahead),
    overridesOff: cfg.overrides_disabled === true, checkpoint: num(cfg.checkpoint),
    env: Object.fromEntries(Object.entries(env).map(([k, v]) => [k, String(v)])),
    updated: str(data.updated),
    n: num(agg.n) ?? runs.length, successes: num(agg.successes), ci: ci && ci.length === 2 ? [ci[0], ci[1]] : null,
    hpRatio: num(agg.hp_ratio_mean), died: num(agg.died), finalHpMean: num(agg.final_hp_mean),
    floorsMax: num(agg.floors_reached_max), secondsPerCall: num(agg.seconds_per_call), parseErrorRate: num(agg.parse_error_rate),
    runs, rerun: registry.labels[label] ?? [],
  });
}
cells.sort((a, b) => a.label.localeCompare(b.label));

const commit = (() => {
  try { return execFileSync("git", ["-C", LAB, "describe", "--tags", "--always", "--dirty"], { encoding: "utf8" }).trim(); }
  catch { return null; }
})();
const generated = new Date().toISOString();
const results: ResultsIndex = {
  generated, source: { repo: "https://github.com/thetobysiu/mt-ai-lab", version: commit }, thesisSource: String(thesis.source ?? ""),
  tables, cells, catalog: registry.catalog,
};
writeJson("index.json", results);
const index: EpisodeIndex = { generated, episodes };
writeJson("episodes.json", index);
console.log(`index: ${tables.length} tables, ${cells.length} cells (${cells.filter((c) => c.thesis).length} cited by the thesis)`);
console.log(`scrubbed: ${scrubStats.paths} paths, ${scrubStats.user} user names, ${scrubStats.keys} key fields`);
for (const s of scrubSamples) console.log("  path:", s);
if (missing.length) console.log("missing logs:", missing.slice(0, 10).join(", "), missing.length > 10 ? "…" : "");
