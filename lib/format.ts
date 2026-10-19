export function pct(x: number | null | undefined, digits = 0): string {
  return x == null || Number.isNaN(x) ? "–" : `${(x * 100).toFixed(digits)}%`;
}

export function num(x: number | null | undefined, digits = 2): string {
  return x == null || Number.isNaN(x) ? "–" : x.toFixed(digits);
}

export function ci(a: [number, number] | null | undefined): string {
  return a ? `[${a[0].toFixed(2)}, ${a[1].toFixed(2)}]` : "";
}

/** Wilson 95 % interval of k successes in n trials. */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 1];
  const p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

/** Display name of a model id as stored in the logs (e.g. qwen3.6-35b-a3b → Qwen3.6-35B). */
export function modelName(m: string | null | undefined): string {
  if (!m) return "rule-based heuristic";
  const s = m.replace(/-a\d+b$/i, "").replace(/-instruct.*$/i, "").replace(/-\d{4}$/, "");
  const known: Record<string, string> = {
    "qwen3.5-397b": "Qwen3.5-397B", "qwen3.6-35b": "Qwen3.6-35B", "qwen3.8-27b": "Qwen3.8-27B", "qwen3.5-35b": "Qwen3.5-35B",
    "qwen3.5-122b": "Qwen3.5-122B", "qwen3.5-27b": "Qwen3.5-27B", "deepseek-v4-flash": "DeepSeek-V4-Flash",
    "mistral-medium-3.5": "Mistral-Medium-3.5", "mistral-medium-3.5-128b": "Mistral-Medium-3.5", "llama-3.1-8b": "Llama-3.1-8B", "meta-llama-3.1-8b": "Llama-3.1-8B",
    "glm-5.3-flash": "GLM-5.3-Flash", "gemma-4-31b": "Gemma-4-31B", "gpt-oss-120b": "gpt-oss-120b",
  };
  return known[s.toLowerCase()] ?? s;
}

const BREAK_ARMOR_RATIO = 0.9, COUNTER_ATTACK_RATIO = 0.1, PURIFY_MULTIPLIER = 3;  // mota/game/data.py

/** Mirror of mota/game/damage.py calculate() for the map overlay (constants from damage.py). */
export function calcEnemyDmg(
  hero: { atk: number; def: number; hp?: number; mdef?: number },
  mon: { hp: number; atk: number; def: number; specials?: number[]; fixed?: number; vampire?: number; n?: number },
): number | null {
  const sp = mon.specials || [];
  let mAtk = mon.atk, mDef = mon.def;
  if (sp.includes(10)) { mAtk = hero.atk; mDef = hero.def; }
  if (sp.includes(3) && mDef < hero.atk - 1) mDef = hero.atk - 1;
  const per = Math.max(0, hero.atk - mDef);
  if (per <= 0) return null;
  const turns = Math.ceil(mon.hp / per);
  let perDamage = sp.includes(2) ? mAtk : Math.max(0, mAtk - hero.def);
  if (sp.includes(4)) perDamage *= 2; else if (sp.includes(5)) perDamage *= 3; else if (sp.includes(6)) perDamage *= mon.n && mon.n > 0 ? mon.n : 4;
  const mdef = hero.mdef ?? 0;
  let init = sp.includes(1) ? perDamage : 0;
  if (sp.includes(11)) init += Math.floor((hero.hp ?? 0) * (mon.vampire ?? 0));
  if (sp.includes(7)) init += Math.floor(BREAK_ARMOR_RATIO * hero.def);
  if (sp.includes(9)) init += PURIFY_MULTIPLIER * mdef;
  const counter = sp.includes(8) ? Math.floor(COUNTER_ATTACK_RATIO * hero.atk) : 0;
  let total = init + (perDamage + counter) * Math.max(0, turns - 1);
  if (sp.includes(22)) total += mon.fixed ?? 0;
  return Math.max(0, total - mdef);
}

export const SPECIAL_NAMES: Record<number, string> = {
  1: "First Strike", 2: "Magic ATK", 3: "Solid", 4: "Double Hit", 5: "Triple Hit", 6: "N-Hit", 7: "Break Armor",
  8: "Counter", 9: "Purify", 10: "Mimic", 11: "Vampire", 22: "Fixed Dmg",
};

/** "simple" → "Simple floor", "hand01" → "hand01", "MT0-MT23w" → "Tower MT0→MT23w". */
export function scenarioName(floor: string): string {
  if (/^MT\d+-MT/.test(floor)) return `Tower ${floor.replace("-", "→")}`;
  const f = floor.split(/[\\/]/).pop()!.replace(/\.txt$/, "");
  if (f === "simple") return "Simple floor";
  if (f === "complex") return "Complex floor";
  return f;
}
