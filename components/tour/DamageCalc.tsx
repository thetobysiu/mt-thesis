"use client";
// Combat on the simple floor: pick a monster, move the hero's ATK and DEF, and see the strikes and the HP cost.
import { useMemo, useState } from "react";
import { parseFloor, type MonsterDef } from "@/lib/engine/floor";
import { fightDamage } from "@/lib/engine/state";
import { SPECIAL_NAMES } from "@/lib/format";

export function DamageCalc({ text }: { text: string }) {
  const floor = useMemo(() => parseFloor("simple", text), [text]);
  const monsters = useMemo(() => {
    const seen = new Map<number, MonsterDef>();
    for (const row of floor.grid) for (const t of row) if (floor.monsters[t] && !seen.has(t)) seen.set(t, floor.monsters[t]);
    return [...seen.values()].sort((a, b) => a.hp - b.hp);
  }, [floor]);
  const [mi, setMi] = useState(() => Math.max(0, monsters.findIndex((m) => m.name.startsWith("Bat"))));
  const [atk, setAtk] = useState(floor.hero.atk);
  const [def, setDef] = useState(floor.hero.def);
  const m = monsters[mi];
  const hero = { ...floor.hero, atk, def };
  const dmg = m ? fightDamage(hero, m) : null;
  const per = m ? atk - m.def : 0;
  const strikes = per > 0 && m ? Math.ceil(m.hp / per) : null;
  const hit = m ? Math.max(0, m.atk - def) : 0;
  // what one more point would save
  const plusAtk = m ? fightDamage({ ...hero, atk: atk + 1 }, m) : null;
  const plusDef = m ? fightDamage({ ...hero, def: def + 1 }, m) : null;

  return (
    <div className="panel p-4 flex flex-col gap-4" data-testid="damage-calc">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[14px]">Monster
          <select className="input" value={mi} onChange={(e) => setMi(Number(e.target.value))} aria-label="monster">
            {monsters.map((x, i) => <option key={x.name + i} value={i}>{x.name} (HP {x.hp}, ATK {x.atk}, DEF {x.def})</option>)}
          </select>
        </label>
        {m?.special ? <span className="tag tag-warn">{SPECIAL_NAMES[m.special] ?? `special ${m.special}`}</span> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[14px]">
          <span>Hero ATK <b className="mono">{atk}</b> <span className="muted text-[12px]">(start {floor.hero.atk})</span></span>
          <input type="range" min={floor.hero.atk} max={floor.hero.atk + 6} value={atk} onChange={(e) => setAtk(Number(e.target.value))} aria-label="hero attack" />
        </label>
        <label className="flex flex-col gap-1 text-[14px]">
          <span>Hero DEF <b className="mono">{def}</b> <span className="muted text-[12px]">(start {floor.hero.def})</span></span>
          <input type="range" min={floor.hero.def} max={floor.hero.def + 8} value={def} onChange={(e) => setDef(Number(e.target.value))} aria-label="hero defence" />
        </label>
      </div>
      {m && (
        <div className="grid gap-3 sm:grid-cols-3 text-[14px]">
          <div className="kpi"><span className="k">Hero strikes needed</span>
            <span className="v">{strikes ?? "–"}</span>
            <span className="muted text-[12px]">{per > 0 ? `⌈${m.hp} / (${atk} − ${m.def})⌉ = ⌈${m.hp} / ${per}⌉` : `ATK ${atk} ≤ monster DEF ${m.def}: no damage`}</span>
          </div>
          <div className="kpi"><span className="k">Monster strikes</span>
            <span className="v">{strikes ? strikes - 1 : "–"}</span>
            <span className="muted text-[12px]">the hero strikes first; each monster strike: max(0, {m.atk} − {def}) = {hit}</span>
          </div>
          <div className="kpi"><span className="k">HP cost of the fight</span>
            <span className="v" style={{ color: dmg == null ? "var(--bad)" : dmg === 0 ? "var(--ok)" : undefined }}>{dmg == null ? "unwinnable" : dmg}</span>
            <span className="muted text-[12px]">{dmg == null ? "raise ATK above the monster's DEF" : m.special ? "special ability applied (Table 4.1)" : `${hit} × ${strikes! - 1}`}</span>
          </div>
        </div>
      )}
      {m && dmg != null && (
        <p className="text-[14px]">
          One more ATK point would make this fight cost <b>{plusAtk ?? "–"}</b>, one more DEF point <b>{plusDef ?? "–"}</b>.
          {dmg > 0 && plusDef != null && plusAtk != null && " A stat point applies to every later strike, so a gem picked up before a fight can save more HP than it seems to be worth."}
        </p>
      )}
    </div>
  );
}
