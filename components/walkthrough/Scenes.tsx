"use client";
// The walkthrough's scenes: every frame is a pure function of the time t (seconds), drawn on the 1280 × 720 stage canvas.
// The same function renders the live player and each frame of the captured video, so both always agree.
import { memo, useMemo, type CSSProperties, type ReactNode } from "react";
import { TileLayer } from "@/components/FloorMap";
import { untilDecision } from "@/components/tour/DecisionQuiz";
import { parseFloor, type MonsterDef } from "@/lib/engine/floor";
import { floorMapData } from "@/lib/engine/mapdata";
import { GameState, fightDamage, posKey, type Action } from "@/lib/engine/state";
import { countUp, ease, lerp, pr, window01 } from "@/lib/stage";
import { CHAPTERS, chapterAt, cueAt, tryAt, type TryPoint } from "@/lib/walkthrough";
import type { PresentData } from "@/lib/present-shared";
import type { MapData } from "@/lib/types";

export const K = {
  bg: "#0B1220", panel: "#111A2E", panel2: "#17223B", border: "#2A3753", text: "#F1F5F9", soft: "#CBD5E1", muted: "#94A3B8",
  gold: "#F5B83D", green: "#34D399", red: "#F87171", blue: "#38BDF8", orange: "#F59E0B", slate: "#64748B",
};
const MONO = "var(--font-mono), ui-monospace, monospace";

const Tiles = memo(TileLayer);
type Hero = { x: number; y: number };
type Step = { hero: Hero; removed: Set<string>; hp: number; atk: number; def: number; decision: number };

export type SceneData = {
  simple: { map: MapData; steps: Step[]; decisions: number };
  decision: { state: GameState; hero: Hero; actions: Action[]; best: number; good: number };
  complex: { map: MapData };
  example: { name: string; now: number; after: number; gem: number } | null;
  flip: PresentData["flip"];
  tower: PresentData["tower"];
  siteUrl: string;
};

/** Everything the scenes draw that is derived from the floors and the stored results, computed once. */
export function useSceneData(d: PresentData, siteUrl: string): SceneData {
  return useMemo(() => {
    const sf = parseFloor("simple", d.simple.text);
    const route = d.simple.solution.exact.route;
    const steps: Step[] = [];
    const removed = new Set<string>();
    let decision = 0;
    for (const s of route) {
      for (const t of s.tiles) removed.add(posKey(t.x, t.y));
      if (s.kind === "decision") decision += s.tiles.length;   // each monster and door separately, as Table 4.4
      const at = s.tiles.at(-1) ?? { x: sf.hero.x, y: sf.hero.y };
      steps.push({ hero: { x: at.x, y: at.y }, removed: new Set(removed), hp: s.hp, atk: s.atk, def: s.def, decision });
    }
    if (steps.length && route[0]?.kind === "start") steps[0].removed = new Set();

    const state = untilDecision(new GameState(sf));
    const actions = state.actions();
    const good = actions.findIndex((a) => /Black Slime/.test(a.label));

    // the fight on the simple floor whose cost a single ATK gem lowers the most, at the start attributes
    let example: SceneData["example"] = null;
    const h0 = sf.hero, h1 = { ...sf.hero, atk: sf.hero.atk + sf.bonuses.redGem };
    for (const m of Object.values(sf.monsters) as MonsterDef[]) {
      const a = fightDamage(h0, m), b = fightDamage(h1, m);
      if (a == null || b == null || a <= b) continue;
      if (!example || a - b > example.now - example.after) example = { name: m.name, now: a, after: b, gem: sf.bonuses.redGem };
    }

    return {
      simple: { map: floorMapData(sf), steps, decisions: decision },
      decision: { state, hero: { x: state.hero.x, y: state.hero.y }, actions, best: d.simple.optimum, good },
      complex: { map: floorMapData(parseFloor("complex", d.complex.text)) },
      example, flip: d.flip, tower: d.tower, siteUrl,
    };
  }, [d, siteUrl]);
}

// ------------------------------------------------------------------ primitives

const rise = (t: number, at: number, d = 0.6, dy = 16): CSSProperties => {
  const p = ease.out(pr(t, at, at + d));
  return { opacity: p, transform: `translateY(${((1 - p) * dy).toFixed(2)}px)` };
};
const pulse = (t: number, amp = 0.06) => 1 + amp * Math.sin(t * 5.2);

function Box({ x, y, w, h, style, children }: { x: number; y: number; w?: number; h?: number; style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
}
function Panel({ style, children, accent }: { style?: CSSProperties; children: ReactNode; accent?: string }) {
  return (
    <div style={{ background: K.panel, border: `1px solid ${K.border}`, borderTop: accent ? `4px solid ${accent}` : undefined, borderRadius: 12,
                  padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8, ...style }}>{children}</div>
  );
}
function Big({ v, k, c, style }: { v: ReactNode; k: ReactNode; c: string; style?: CSSProperties }) {
  return (
    <div style={{ background: K.panel, border: `1px solid ${K.border}`, borderLeft: `6px solid ${c}`, borderRadius: 12, padding: "12px 18px", ...style }}>
      <div style={{ fontFamily: MONO, fontSize: 46, fontWeight: 700, lineHeight: 1.05, color: c }}>{v}</div>
      <div style={{ fontSize: 17, color: K.soft, marginTop: 4 }}>{k}</div>
    </div>
  );
}
function Pill({ c, children, style }: { c: string; children: ReactNode; style?: CSSProperties }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, border: `1px solid ${c}`, color: c, fontSize: 14, fontWeight: 600, ...style }}>{children}</span>;
}
function Bar({ label, k, n, c, p, w = 360, sub }: { label: ReactNode; k: number; n: number; c: string; p: number; w?: number; sub?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}><span>{label}</span><b style={{ fontFamily: MONO, color: c }}>{Math.round(k * p)}/{n}</b></div>
      <div style={{ width: w, height: 18, borderRadius: 9, background: K.panel2, overflow: "hidden" }}>
        <div style={{ width: `${(k / n) * p * 100}%`, height: "100%", background: c, borderRadius: 9 }} />
      </div>
      {sub && <span style={{ fontSize: 13, color: K.muted }}>{sub}</span>}
    </div>
  );
}

function MapBox({ map, cell, removed, hero, x, y, children, style }: { map: MapData; cell: number; removed?: Set<string>; hero?: Hero | null; x: number; y: number; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: map.width * cell, height: map.height * cell, borderRadius: 6, overflow: "visible",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.45)", ...style }}>
      <Tiles map={map} cell={cell} removed={removed} hero={hero} />
      {children}
    </div>
  );
}
function Ring({ x, y, cell, c, label, scale = 1, dashed, opacity = 1, note, noteSide = "right" }: {
  x: number; y: number; cell: number; c: string; label?: ReactNode; scale?: number; dashed?: boolean; opacity?: number; note?: ReactNode; noteSide?: "right" | "left";
}) {
  return (
    <div style={{ position: "absolute", left: x * cell - 3, top: y * cell - 3, width: cell + 6, height: cell + 6, opacity, transform: `scale(${scale})`,
                  border: `3px ${dashed ? "dashed" : "solid"} ${c}`, borderRadius: 8, boxShadow: `0 0 18px ${c}66` }}>
      {label != null && <span style={{ position: "absolute", left: -10, top: -12, minWidth: 22, height: 22, borderRadius: 11, background: c, color: K.bg,
                                      fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{label}</span>}
      {note && <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [noteSide === "right" ? "left" : "right"]: cell + 14, whiteSpace: "nowrap",
                              background: "rgba(5,9,18,0.9)", border: `1px solid ${c}`, color: K.text, fontSize: 15, padding: "4px 10px", borderRadius: 8 }}>{note}</span>}
    </div>
  );
}

/** One SVG arrow drawn progressively (p = 0..1). */
function Arrow({ d, p, c = K.gold, w = 3 }: { d: string; p: number; c?: string; w?: number }) {
  return (
    <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p}
          markerEnd={p > 0.98 ? "url(#wt-head)" : undefined} style={{ color: c }} />
  );
}
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width={1280} height={720} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
      <defs>
        <marker id="wt-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

const H2 = ({ t, at, children, style }: { t: number; at: number; children: ReactNode; style?: CSSProperties }) =>
  <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 650, letterSpacing: "-0.01em", ...rise(t, at), ...style }}>{children}</div>;

// ------------------------------------------------------------------ scenes

function SQuestion({ t, s }: { t: number; s: SceneData }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.16,
                    transform: `scale(${lerp(1.14, 1, ease.out(pr(t, 0, 12))).toFixed(4)})` }}>
        <Tiles map={s.simple.map} cell={62} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(11,18,32,0.35), rgba(11,18,32,0.97) 72%)" }} />
      <Box x={0} y={170} w={1280} style={{ textAlign: "center", opacity: window01(t, 0.2, 5.8, 0.5) }}>
        <div style={{ fontSize: 42, color: K.soft, ...rise(t, 0.3) }}>Can a language model plan a route of</div>
        <div style={{ fontSize: 92, fontWeight: 750, color: K.gold, fontFamily: MONO, lineHeight: 1.15, ...rise(t, 0.9) }}>
          {countUp(t, 0.9, 3.2, 1, s.simple.decisions)} decisions
        </div>
        <div style={{ fontSize: 40, color: K.text, ...rise(t, 2.6) }}>when a single wrong one loses the floor?</div>
      </Box>
      <Box x={110} y={150} w={1060} style={{ opacity: window01(t, 5.8, 12.3, 0.5) }}>
        <div style={{ width: lerp(0, 150, ease.out(pr(t, 5.9, 6.8))), height: 5, background: K.gold, borderRadius: 3 }} />
        <h1 style={{ fontSize: 50, lineHeight: 1.12, margin: "18px 0 10px", color: "#fff", fontFamily: "var(--font-sans), system-ui, sans-serif", fontWeight: 700, letterSpacing: "-0.01em", ...rise(t, 6.0) }}>From Reactive Control to Holistic Planning</h1>
        <p style={{ fontSize: 23, color: K.soft, margin: 0, ...rise(t, 6.6) }}>Evolutionary Prompt Optimization for Hybrid Deterministic-Neural Agents in Long-Horizon Environments</p>
        <p style={{ fontSize: 19, color: K.muted, margin: "22px 0 0", ...rise(t, 7.3) }}>King Wai Siu · Master&apos;s thesis · Leuphana University Lüneburg</p>
        <div style={{ display: "flex", gap: 12, marginTop: 34 }}>
          {["Magic Tower", "an exact solver", "4 language models", "3 research questions"].map((x, i) => (
            <span key={x} style={{ ...rise(t, 8.1 + i * 0.35), padding: "8px 16px", borderRadius: 10, background: K.panel, border: `1px solid ${K.border}`, fontSize: 19 }}>{x}</span>
          ))}
        </div>
      </Box>
    </>
  );
}

function SGame({ t, s }: { t: number; s: SceneData }) {
  const steps = s.simple.steps;
  const i = Math.min(steps.length - 1, Math.floor(ease.inOut(pr(t, 12.6, 29.2)) * (steps.length - 1)));
  const st = steps[i];
  const ex = s.example;
  const pb = ease.out(pr(t, 19.6, 21.2));
  return (
    <>
      <Box x={56} y={62} style={{ display: "flex", gap: 10, ...rise(t, 12.2) }}>
        <Pill c={K.red}>HP {st.hp}</Pill><Pill c={K.orange}>ATK {st.atk}</Pill><Pill c={K.blue}>DEF {st.def}</Pill>
        <Pill c={K.muted}>exact optimal route · action {st.decision}/{s.simple.decisions}</Pill>
      </Box>
      <MapBox map={s.simple.map} cell={44} removed={st.removed} hero={st.hero} x={56} y={100} style={rise(t, 12.2, 0.8, 0)} />
      <Box x={600} y={62} w={626} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel accent={K.gold} style={rise(t, 12.4)}>
          <b style={{ fontSize: 20, color: K.gold }}>Every fight follows one formula</b>
          <div style={{ fontFamily: MONO, fontSize: 17, lineHeight: 1.6, whiteSpace: "pre" }}>
            {"strikes  T = ⌈ monster HP / (ATK − monster DEF) ⌉\nHP cost  D = max(0, monster ATK − DEF) · (T − 1)"}
          </div>
          <div style={{ display: "flex", gap: 10, ...rise(t, 15) }}>
            <Pill c={K.orange}>ATK ↑ fewer strikes</Pill><Pill c={K.blue}>DEF ↑ every strike smaller</Pill><Pill c={K.muted}>no randomness</Pill>
          </div>
        </Panel>
        {ex && (
          <Panel accent={K.green} style={rise(t, 19.1)}>
            <b style={{ fontSize: 20, color: K.green }}>So the order matters</b>
            <span style={{ fontSize: 16, color: K.soft }}>{ex.name} at the start attributes, exact:</span>
            {([["fought now", ex.now, K.red], [`after a +${ex.gem} ATK gem`, ex.after, K.green]] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l} style={{ display: "grid", gridTemplateColumns: "170px 1fr 70px", alignItems: "center", gap: 10, fontSize: 16 }}>
                <span>{l}</span>
                <div style={{ height: 16, borderRadius: 8, background: K.panel2 }}><div style={{ width: `${(v / ex.now) * 100 * pb}%`, height: "100%", borderRadius: 8, background: c }} /></div>
                <b style={{ fontFamily: MONO, color: c, textAlign: "right" }}>{Math.round(v * pb)} HP</b>
              </div>
            ))}
          </Panel>
        )}
        <Panel accent={K.red} style={rise(t, 25.1)}>
          <b style={{ fontSize: 20, color: K.red }}>Nothing comes back</b>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["keys are consumed", "HP is lost", "monsters and items disappear"].map((x, k) => <Pill key={x} c={K.soft} style={rise(t, 25.5 + k * 0.4)}>{x}</Pill>)}
          </div>
        </Panel>
      </Box>
    </>
  );
}

const shortLabel = (a: Action) => a.label.replace(/ dmg=\d+$/, "");

function SDecision({ t, s }: { t: number; s: SceneData }) {
  const { state, hero, actions, best, good } = s.decision;
  const reveal = (i: number) => pr(t, 37.2 + i * 0.3, 37.6 + i * 0.3);
  return (
    <>
      <Box x={56} y={62} style={{ display: "flex", gap: 10, ...rise(t, 30.2) }}>
        <Pill c={K.red}>HP {state.hero.hp}</Pill><Pill c={K.orange}>ATK {state.hero.atk}</Pill><Pill c={K.blue}>DEF {state.hero.def}</Pill>
        <Pill c={K.gold}>yellow keys {state.hero.yellow}</Pill>
      </Box>
      <MapBox map={s.simple.map} cell={44} removed={state.removed} hero={hero} x={56} y={100}>
        {actions.map((a, i) => {
          const r = reveal(i), win = i === good;
          const c = r > 0.5 ? (win ? K.green : K.red) : K.gold;
          return <Ring key={a.id} x={a.x} y={a.y} cell={44} c={c} label={i + 1} opacity={pr(t, 31 + i * 0.4, 31.4 + i * 0.4)}
                       scale={win && t > 38 ? pulse(t) : 1} />;
        })}
      </MapBox>
      <Box x={600} y={62} w={626} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <H2 t={t} at={30.3}>The first decision</H2>
        <span style={{ fontSize: 17, color: K.soft, ...rise(t, 30.6) }}>The engine has collected the key next to the start; {actions.length} actions are legal.</span>
        {actions.map((a, i) => {
          const r = reveal(i), win = i === good;
          return (
            <div key={a.id} style={{ ...rise(t, 31.2 + i * 0.4), display: "grid", gridTemplateColumns: "34px 1fr auto", alignItems: "center", gap: 12,
                                      background: K.panel, border: `1px solid ${r > 0.5 ? (win ? K.green : K.red) : K.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, background: K.gold, color: K.bg, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <span style={{ fontSize: 17 }}>{shortLabel(a)}<span style={{ color: K.muted, fontSize: 15 }}>{a.type === "fight" ? ` · ${a.damage} HP` : a.type === "door" ? " · uses a key" : ""}</span></span>
              <span style={{ opacity: r, fontFamily: MONO, fontSize: 15, fontWeight: 700, color: win ? K.green : K.red }}>{win ? `still ${best} HP` : "floor lost"}</span>
            </div>
          );
        })}
        <span style={{ fontSize: 14, color: K.muted, ...rise(t, 37.4) }}>Exact solver: best final HP still reachable after each action</span>
        <Big c={K.green} style={rise(t, 44.1)} v={`${countUp(t, 44.2, 45.6, 0, 19)} / 20`} k="re-run episodes fought the Black Slime" />
      </Box>
    </>
  );
}

function SAgent({ t, s }: { t: number; s: SceneData }) {
  const { actions, good } = s.decision;
  const out = 1 - pr(t, 63.9, 64.4);
  const box = (x: number, w: number, at: number, c: string, title: string, body: ReactNode) => (
    <Box x={x} y={96} w={w} h={236} style={{ ...rise(t, at), opacity: Math.min(1, ease.out(pr(t, at, at + 0.6))) * out }}>
      <Panel accent={c} style={{ height: "100%" }}>
        <b style={{ fontSize: 21, color: c }}>{title}</b>
        {body}
      </Panel>
    </Box>
  );
  return (
    <>
      {box(56, 330, 50.3, K.blue, "Engine (exact)", (
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 17, lineHeight: 1.55, listStyle: "disc" }}>
          <li>reachable targets</li><li>exact damage of every fight</li><li>lookahead, three gateways deep</li><li>assists: items, 0-HP fights</li>
        </ul>
      ))}
      {box(450, 390, 51.8, K.gold, "Observation", (
        <div style={{ fontFamily: MONO, fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre" }}>
          {actions.slice(0, 4).map((a, i) => <div key={a.id} style={{ opacity: pr(t, 52.2 + i * 0.35, 52.5 + i * 0.35) }}>{`${i + 1}. ${shortLabel(a)}`.slice(0, 44)}</div>)}
          <div style={{ color: K.muted, marginTop: 6, fontFamily: "inherit", opacity: pr(t, 53.6, 54) }}>+ exact costs, tags, net stat route,{"\n"}  fight order, key budget</div>
        </div>
      ))}
      {box(904, 320, 53.4, K.green, "Language model", (
        <>
          <span style={{ fontSize: 17, color: K.soft }}>reads the list, reasons, answers with one number: never a tile path</span>
          <span style={{ fontFamily: MONO, fontSize: 24, color: K.green, marginTop: "auto", opacity: pr(t, 54.6, 55) }}>FINAL_CHOICE: {good + 1}</span>
        </>
      ))}
      <Svg>
        <g opacity={out}>
          <Arrow d="M 390 214 L 444 214" p={ease.out(pr(t, 51.2, 51.8))} />
          <Arrow d="M 844 214 L 898 214" p={ease.out(pr(t, 52.8, 53.4))} />
          <Arrow d="M 1064 336 C 1064 400, 221 400, 221 340" p={ease.inOut(pr(t, 55.2, 56.6))} c={K.blue} />
        </g>
      </Svg>
      <Box x={420} y={398} w={440} style={{ textAlign: "center", fontSize: 15, color: K.blue, opacity: pr(t, 56.2, 56.8) * out }}>the engine validates, executes and logs every override</Box>
      <Box x={56} y={436} w={1170} style={{ ...rise(t, 58.1), opacity: Math.min(1, ease.out(pr(t, 58.1, 58.7))) * out }}>
        <Panel accent={K.orange} style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 560 }}>
            <b style={{ fontSize: 21, color: K.orange }}>Exact solver</b>
            <span style={{ fontSize: 17, color: K.soft }}>Breadth-first over the sets of removed obstacles; keeps the state with the most HP per set. Scores every state of every episode.</span>
          </div>
          <div style={{ display: "flex", gap: 30, alignItems: "baseline", marginLeft: "auto" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 50, color: K.muted, textDecoration: t > 60.6 ? "line-through" : "none" }}>22</div>
              <div style={{ fontSize: 14, color: K.muted }}>published solver</div>
            </div>
            <div style={{ fontSize: 34, color: K.muted, opacity: pr(t, 60.4, 60.8) }}>→</div>
            <div style={{ textAlign: "center", opacity: pr(t, 60.6, 61) }}>
              <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 750, color: K.orange }}>{countUp(t, 60.7, 62.4, 22, 68)}</div>
              <div style={{ fontSize: 14, color: K.soft }}>exact optimum, complex floor (HP)</div>
            </div>
          </div>
        </Panel>
      </Box>
      <Box x={56} y={110} w={1170} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 18, opacity: pr(t, 64.1, 64.6) }}>
        {([["RQ1 · The observation", "What do the engine's exact annotations contribute?", K.gold, true],
           ["RQ2 · The prompt", "Does evolutionary prompt optimisation help?", K.green, false],
           ["RQ3 · The horizon", "React at every step, or commit to a plan?", K.orange, false]] as [string, string, string, boolean][]).map(([h, q, c, on], i) => (
          <div key={h} style={{ ...rise(t, 64.3 + i * 0.3), opacity: on ? 1 : 0.45 }}>
            <Panel accent={c} style={{ height: 300, justifyContent: "center", transform: on ? `scale(${lerp(1, 1.03, ease.out(pr(t, 65, 66)))})` : undefined }}>
              <b style={{ fontSize: 26, color: c }}>{h}</b>
              <span style={{ fontSize: 22 }}>{q}</span>
            </Panel>
          </div>
        ))}
      </Box>
    </>
  );
}

const HL = /(save \d+ HP|\d+ HP of fighting to reach them|net [+-]\d+ HP|wastes \d+ HP|effCost=-?\d+)/;
function Line({ text, two }: { text: string; two: boolean }) {
  const parts = text.replace(/^→\s*/, "").split(HL);
  return (
    <div style={{ fontFamily: MONO, fontSize: 14, lineHeight: 1.5, color: K.soft }}>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <span key={i}>{p}</span>;
        const c = /^net \+/.test(p) ? K.green : /^net -/.test(p) || /wastes/.test(p) ? K.red : /of fighting/.test(p) ? K.orange : two ? K.gold : K.gold;
        return <b key={i} style={{ color: c, background: `${c}22`, borderRadius: 4, padding: "0 3px" }}>{p}</b>;
      })}
    </div>
  );
}

function SObservation({ t, s }: { t: number; s: SceneData }) {
  const f = s.flip;
  const two = t >= 78;
  const swap = window01(t, 70, 78, 0.35) + window01(t, 78, 95, 0.35);
  const pb = ease.out(pr(t, 79.8, 81.6));
  return (
    <>
      <Box x={56} y={58} w={760} style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <H2 t={t} at={70.2}>Turn 9: same state, same model</H2>
        <Pill c={two ? K.green : K.red} style={{ marginLeft: "auto", fontSize: 16, ...rise(t, 70.6) }}>{two ? "two-sided lines" : "one-sided lines"}</Pill>
      </Box>
      <Box x={56} y={112} w={760} style={{ display: "flex", flexDirection: "column", gap: 12, opacity: swap }}>
        {f?.actions.map((a, i) => {
          const chosen = (two ? f.choseTwo : f.choseOne) === a.key;
          return (
            <div key={a.key} style={{ ...rise(t, 70.6 + i * 0.4), background: K.panel, border: `1px solid ${chosen ? K.gold : K.border}`, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <b style={{ fontSize: 17 }}>{a.label}</b>
                {chosen && <Pill c={K.gold} style={{ fontSize: 13 }}>the model chose this</Pill>}
                {two && t > 82 && <span style={{ marginLeft: "auto", fontSize: 14, color: a.good ? K.green : K.red, opacity: pr(t, 82, 82.6) }}>exact: {a.outcome}</span>}
              </div>
              {(two ? a.two : a.one).slice(a.key === "1,9" ? 0 : 1).map((l, k) => <Line key={k} text={l} two={two} />)}
            </div>
          );
        })}
      </Box>
      <Box x={856} y={112} w={370} style={{ opacity: window01(t, 73.4, 78.4, 0.4) }}>
        <Panel accent={K.red}>
          <b style={{ fontSize: 19, color: K.red }}>Exact solver</b>
          <span style={{ fontSize: 17 }}>After the Slime Lord at this turn, the boss can no longer be defeated.</span>
          <span style={{ fontSize: 14, color: K.muted }}>Every premise the model used was in its input.</span>
        </Panel>
      </Box>
      <Box x={856} y={112} w={370} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Panel accent={K.green} style={rise(t, 79.4)}>
          <b style={{ fontSize: 19, color: K.green }}>State the missing side</b>
          <span style={{ fontSize: 15, color: K.soft }}>Qwen3.5-397B, simple floor; model, prompt, temperature and depth unchanged</span>
          <Bar label="before (Table 6.5, row 2)" k={0} n={5} c={K.red} p={pb} w={330} />
          <Bar label="after (row 4)" k={10} n={10} c={K.green} p={pb} w={330} />
        </Panel>
        <Big c={K.gold} style={rise(t, 86.4)} v={`${countUp(t, 86.5, 88, 0, 15)} / 15`} k="simple-floor wins across both runs" />
        <Panel style={rise(t, 89)}>
          <span style={{ fontSize: 15, color: K.soft }}>final HP of every win: <b style={{ color: K.gold }}>2</b> · optimum <b>13</b></span>
          <div style={{ height: 14, borderRadius: 7, background: K.panel2, position: "relative" }}>
            <div style={{ width: `${(2 / 13) * 100 * ease.out(pr(t, 89.4, 90.6))}%`, height: "100%", borderRadius: 7, background: K.gold }} />
          </div>
          <span style={{ fontSize: 14, color: K.muted }}>it wins; it does not play optimally</span>
        </Panel>
      </Box>
    </>
  );
}

function SBoundary({ t, s }: { t: number; s: SceneData }) {
  const m = s.complex.map;
  const cell = Math.floor(Math.min(520 / m.width, 420 / m.height));
  const strike = pr(t, 97.4, 98.2);
  return (
    <>
      <Box x={56} y={58} w={560} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <H2 t={t} at={95.2}>Warning 1: silent overrides</H2>
        <Panel style={rise(t, 95.6)}>
          <div style={{ fontFamily: MONO, fontSize: 16, lineHeight: 1.8, whiteSpace: "pre" }}>
            <div><span style={{ color: K.muted }}>turn 9   model  </span>
              <span style={{ position: "relative" }}>Fight Slime Lord (1,9)
                <span style={{ position: "absolute", left: 0, top: "52%", height: 2, width: `${strike * 100}%`, background: K.red }} />
              </span></div>
            <div style={{ opacity: pr(t, 97.8, 98.4) }}><span style={{ color: K.muted }}>         engine </span>Open yellow door (7,0) <span style={{ color: K.red }}>· not logged</span></div>
          </div>
        </Panel>
        <Big c={K.red} style={rise(t, 98.8)} v={`${countUp(t, 98.9, 100.2, 0, 21)} / 21`} k="early wins contained a silent strategic override" />
        <Panel accent={K.green} style={rise(t, 100.8)}>
          <span style={{ fontSize: 17 }}>Now: <b style={{ color: K.green }}>mechanical overrides only</b> (dead-end door, unwinnable or lethal fight), each logged with the model&apos;s choice</span>
        </Panel>
      </Box>
      <Box x={680} y={58} w={560} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <H2 t={t} at={103}>Warning 2: the boundary</H2>
        <span style={{ fontSize: 16, color: K.soft, ...rise(t, 103.3) }}>Complex floor, general prompt: <b style={{ color: K.red }}>0 / 20 wins</b></span>
      </Box>
      <MapBox map={m} cell={cell} x={680} y={136} style={rise(t, 103.3, 0.8, 0)}>
        <Ring x={10} y={5} cell={cell} c={K.slate} dashed opacity={pr(t, 104.2, 104.8)} note="blamed: opened later (17/20)" noteSide="left" />
        <Ring x={11} y={8} cell={cell} c={K.red} opacity={pr(t, 105.2, 105.8)} scale={pulse(t)} note="lost here: 29 of 30" noteSide="left" />
      </MapBox>
    </>
  );
}

function SPrompt({ t }: { t: number }) {
  const nodes = ["Evaluate", "Reflect", "Validate", "Select"];
  const subs = ["3 training floors", "a teacher reads the traces", "no positions or routes", "keep if ≥ best"];
  const cx = 290, cy = 360, r = 150;
  const a = (t - 110) * 1.4;
  const pb = ease.out(pr(t, 119.6, 121.4));
  return (
    <>
      <Box x={56} y={58}><H2 t={t} at={110.2}>RQ2: evolutionary prompt optimisation</H2></Box>
      <Svg>
        <g opacity={pr(t, 110.4, 111)}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={K.border} strokeWidth={3} />
          <circle cx={cx + r * Math.cos(a)} cy={cy + r * Math.sin(a)} r={9} fill={K.green} />
        </g>
      </Svg>
      {nodes.map((n, i) => {
        const ang = -Math.PI / 2 + (i * Math.PI) / 2;
        return (
          <Box key={n} x={cx + r * Math.cos(ang) - 90} y={cy + r * Math.sin(ang) - 32} w={180}
               style={{ ...rise(t, 110.6 + i * 0.3), textAlign: "center", background: K.panel, border: `1px solid ${K.green}`, borderRadius: 10, padding: "6px 8px" }}>
            <b style={{ fontSize: 18, color: K.green }}>{n}</b><div style={{ fontSize: 13, color: K.soft }}>{subs[i]}</div>
          </Box>
        );
      })}
      <Box x={620} y={104} w={606} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel accent={K.orange} style={rise(t, 112)}>
          <b style={{ fontSize: 19, color: K.orange }}>With the annotations: within the noise floor</b>
          <div style={{ position: "relative", height: 64, marginTop: 4 }}>
            <div style={{ position: "absolute", left: 40, right: 40, top: 32, height: 2, background: K.border }} />
            <div style={{ position: "absolute", left: `calc(50% - ${0.13 * 1000}px)`, width: 260 * ease.out(pr(t, 113, 114.4)), top: 18, height: 30,
                          background: `${K.orange}33`, border: `1px solid ${K.orange}`, borderRadius: 6 }} />
            <span style={{ position: "absolute", left: "50%", top: 54, transform: "translateX(-50%)", fontSize: 13, color: K.orange, whiteSpace: "nowrap", opacity: pr(t, 114, 114.6) }}>
              two runs of the same prompt differ by up to 0.13 (goal score, 13 held-out floors)
            </span>
            <div style={{ position: "absolute", left: `calc(50% + ${0.025 * 1000}px)`, top: 25, width: 16, height: 16, borderRadius: 8, background: K.green, marginLeft: -8, opacity: pr(t, 115.4, 115.8) }} />
            <span style={{ position: "absolute", left: `calc(50% + ${0.025 * 1000 + 14}px)`, top: -2, fontSize: 13, color: K.green, opacity: pr(t, 115.6, 116.2) }}>evolved prompt: +0.025</span>
          </div>
        </Panel>
        <Panel accent={K.red} style={rise(t, 119.1)}>
          <b style={{ fontSize: 19, color: K.red }}>With a reasoning model: both loops overfit</b>
          <span style={{ fontSize: 14, color: K.muted }}>held-out games won (13 floors × 3), bare observation</span>
          <Bar label="rules-only prompt" k={32} n={39} c={K.green} p={pb} w={566} />
          <Bar label="(1+1) loop, best candidate" k={26} n={39} c={K.orange} p={pb} w={566} />
          <Bar label="Pareto loop, best candidate" k={24} n={39} c={K.red} p={pb} w={566} sub="p = 0.008 vs. rules-only; both loops had raised their training score" />
        </Panel>
      </Box>
    </>
  );
}

function SPlanning({ t }: { t: number }) {
  const sx = 340, gap = 84;
  const lane = (y: number, title: string, sub: string, at: number, children: ReactNode) => (
    <>
      <Box x={56} y={y} w={260} style={rise(t, at)}><b style={{ fontSize: 20 }}>{title}</b><div style={{ fontSize: 14, color: K.muted }}>{sub}</div></Box>
      {children}
    </>
  );
  const step = (x: number, y: number, on: number, c: string, mark?: ReactNode) => (
    <Box x={x} y={y} w={58} h={58} style={{ borderRadius: 10, border: `2px solid ${on > 0 ? c : K.border}`, background: on > 0 ? `${c}${Math.round(on * 0x33).toString(16).padStart(2, "0")}` : K.panel,
                                             display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: c }}>{mark}</Box>
  );
  const call = (x: number, y: number, w: number, at: number) => (
    <Box x={x} y={y} w={w} h={24} style={{ borderRadius: 12, background: K.gold, color: K.bg, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", opacity: pr(t, at, at + 0.25) }}>call</Box>
  );
  const broke = t > 131.2;
  return (
    <>
      <Box x={56} y={58}><H2 t={t} at={128.2}>RQ3: react, or commit to a plan?</H2></Box>
      {lane(140, "Reactive", "one action per call; the engine recomputes in between", 128.5, (
        <>
          {Array.from({ length: 10 }, (_, k) => {
            const at = 129 + k * 0.62;
            return <span key={k}>{call(sx + k * gap, 120, 58, at)}{step(sx + k * gap, 150, pr(t, at + 0.15, at + 0.4), K.green, t > at + 0.3 ? "✓" : "")}</span>;
          })}
        </>
      ))}
      {lane(300, "Committed plan", "five actions per call, written before their states exist", 128.8, (
        <>
          {call(sx, 280, 5 * gap - 26, 129.3)}
          {Array.from({ length: 5 }, (_, k) => {
            const at = 129.6 + k * 0.62, bad = k === 2;
            const on = pr(t, at, at + 0.25);
            if (k > 2) return <span key={k}>{step(sx + k * gap, 310, broke ? 0 : on, K.muted, broke ? "·" : "")}</span>;
            return <span key={k}>{step(sx + k * gap, 310, on, bad ? K.red : K.green, t > at + 0.2 ? (bad ? "✗" : "✓") : "")}</span>;
          })}
          <Box x={sx + 2 * gap - 60} y={378} w={360} style={{ fontSize: 15, color: K.red, opacity: pr(t, 131.2, 131.8) }}>a fight the plan placed where it cannot yet be won</Box>
        </>
      ))}
      <Box x={56} y={430} w={1170} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 18 }}>
        <Big c={K.green} style={rise(t, 136.2)} v={`${countUp(t, 136.3, 137.6, 0, 14)} / 20`} k="reactive, simple floor" />
        <Big c={K.red} style={rise(t, 137.6)} v={`${countUp(t, 137.7, 138.8, 0, 1)} / 70`} k="committed plans, simple floor" />
        <Panel accent={K.orange} style={rise(t, 140.6)}>
          <b style={{ fontSize: 18, color: K.orange }}>Only when the order is given</b>
          <span style={{ fontSize: 16 }}>Complex floor with the solver&apos;s route in the prompt: long plans <b>5/5 with 2.4 calls</b>, reactive 8/10 with about 21.</span>
        </Panel>
      </Box>
    </>
  );
}

function STower({ t, s }: { t: number; s: SceneData }) {
  const floorH = 16, base = 496, tx = 70, tw = 130;
  const yOf = (f: number) => base - (f + 1) * floorH;
  const rows = s.tower;
  const colour = (g?: string, i?: number) => (i === rows.length - 1 ? K.green : g === "h" ? "#94A3B8" : g === "1" ? K.slate : g === "2" ? K.blue : K.gold);
  return (
    <>
      <Box x={56} y={58}><H2 t={t} at={145.2}>The 24-floor tower</H2></Box>
      {Array.from({ length: 24 }, (_, f) => (
        <Box key={f} x={tx} y={yOf(f)} w={tw} h={floorH - 2} style={{ background: f === 21 ? `${K.green}44` : K.panel, border: `1px solid ${K.border}`, borderRadius: 3,
                                                                       opacity: pr(t, 145.3 + f * 0.03, 145.6 + f * 0.03), fontSize: 11, color: K.muted, paddingLeft: 6, lineHeight: `${floorH - 2}px` }}>
          {f % 4 === 0 || f === 21 ? `MT${f}` : ""}{f === 21 ? " · normal ending" : ""}
        </Box>
      ))}
      <Box x={tx + tw + 16} y={yOf(21) + floorH / 2 - 1} w={1210 - tx - tw - 16} h={0} style={{ borderTop: `2px dashed ${K.green}`, opacity: pr(t, 146, 146.6) }} />
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        const x = 250 + i * 122;
        const start = last ? 18 : 0;
        const p = last ? ease.inOut(pr(t, 153.2, 155.4)) : ease.out(pr(t, 145.8 + i * 0.45, 147.6 + i * 0.45));
        const f = lerp(start, r.floor, p);
        const c = colour(r.group, i);
        const top = base - (f + 1) * floorH;
        return (
          <span key={`${r.label}-${i}`} style={{ opacity: last ? pr(t, 153, 153.4) : 1 }}>
            <Box x={x} y={top} w={84} h={base - top} style={{ background: `linear-gradient(${c}, ${c}55)`, borderRadius: "6px 6px 0 0", opacity: 0.9 }} />
            <Box x={x - 8} y={top - 26} w={100} style={{ textAlign: "center", fontFamily: MONO, fontWeight: 700, color: c, fontSize: 16 }}>MT{Math.round(f)}</Box>
            <Box x={x - 18} y={base + 6} w={120} style={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.25, color: K.soft }}>{r.label}<div style={{ color: K.muted }}>{r.sub}</div></Box>
          </span>
        );
      })}
      <Box x={250} y={170} w={340} style={rise(t, 155.6)}>
        <Panel accent={K.green}><span style={{ fontSize: 16 }}>Resumed on MT18 with blue keys for sale, as in the original game: <b style={{ color: K.green }}>the normal ending</b>, at turn 832.</span></Panel>
      </Box>
    </>
  );
}

const FEATURES: [string, string][] = [
  ["Episodes", "every episode, turn by turn"], ["Compare", "a win and a loss where they differ"], ["BFS solver", "the exact search, step by step"],
  ["Results", "every cell behind the tables"], ["Prompt optimisation", "every candidate and verdict"], ["Play", "any floor, with exact values"],
  ["Tower game", "the original 24 floors"], ["Presentation", "the defense, with live demos"], ["Thesis", "the full text and the PDF"],
];

function STakeaways({ t, s }: { t: number; s: SceneData }) {
  const cards: [string, string, string, number][] = [
    ["Knowledge goes into the observation", "State both sides of every trade-off in the engine; the prompt adds little on top.", K.gold, 160.5],
    ["Commit only when the order is known", "Reactive control wins where facts appear state by state.", K.orange, 169.1],
    ["Measure against an exact reference", "Repeated runs, logged interventions, an exact optimum.", K.blue, 171.4],
  ];
  return (
    <>
      <Box x={56} y={58}><H2 t={t} at={160.2}>Takeaways</H2></Box>
      <Box x={56} y={112} w={1170} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
        {cards.map(([h, b, c, at]) => (
          <div key={h} style={rise(t, at)}><Panel accent={c} style={{ height: 170 }}><b style={{ fontSize: 22, color: c }}>{h}</b><span style={{ fontSize: 17, color: K.soft }}>{b}</span></Panel></div>
        ))}
      </Box>
      <Box x={56} y={318} w={1170} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {FEATURES.map(([h, b], i) => (
          <div key={h} style={{ ...rise(t, 173.2 + i * 0.2), background: K.panel, border: `1px solid ${K.border}`, borderRadius: 10, padding: "8px 14px" }}>
            <b style={{ fontSize: 17, color: K.gold }}>{h}</b> <span style={{ fontSize: 15, color: K.soft }}>· {b}</span>
          </div>
        ))}
      </Box>
      <Box x={0} y={520} w={1280} style={{ textAlign: "center", fontFamily: MONO, fontSize: 26, color: K.text, ...rise(t, 175.4) }}>
        {s.siteUrl.replace(/^https?:\/\//, "")}
      </Box>
    </>
  );
}

const SCENES: Record<string, (p: { t: number; s: SceneData }) => ReactNode> = {
  question: SQuestion, game: SGame, decision: SDecision, agent: SAgent, observation: SObservation,
  boundary: SBoundary, prompt: ({ t }) => <SPrompt t={t} />, planning: ({ t }) => <SPlanning t={t} />, tower: STower, takeaways: STakeaways,
};

/** The whole frame at time t: scene, chapter label, progress line, try chip and caption. */
export function WalkthroughFrame({ t, s, captions, onTry, live }: { t: number; s: SceneData; captions: boolean; onTry?: (p: TryPoint) => void; live: boolean }) {
  const ch = chapterAt(t);
  const n = CHAPTERS.indexOf(ch);
  const Scene = SCENES[ch.id];
  const cue = cueAt(t);
  const tp = tryAt(t);
  return (
    <div style={{ position: "absolute", inset: 0, background: K.bg, color: K.text, fontFamily: "var(--font-sans), system-ui, sans-serif", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: window01(t, ch.start, ch.end, ch.start === 0 ? 0.2 : 0.3) }}>{Scene && <Scene t={t} s={s} />}</div>
      <div style={{ position: "absolute", left: 0, top: 0, height: 3, width: `${(t / CHAPTERS[CHAPTERS.length - 1].end) * 100}%`, background: K.gold }} />
      {n > 0 && (
        <div style={{ position: "absolute", left: 56, top: 20, fontSize: 14, color: K.muted, fontFamily: MONO, opacity: pr(t, ch.start, ch.start + 0.4) }}>
          {String(n).padStart(2, "0")} · {ch.title}
        </div>
      )}
      {tp && (
        live && onTry
          ? <button className="wt-chip" style={{ opacity: window01(t, tp.at, tp.until, 0.3), cursor: "pointer" }} onClick={() => onTry(tp)}>
              <span style={{ color: K.gold }}>▶</span> {tp.label} <span style={{ color: K.muted, fontSize: 12 }}>(pauses)</span>
            </button>
          : <div className="wt-chip" style={{ opacity: window01(t, tp.at, tp.until, 0.3) }}><span style={{ color: K.gold }}>▶</span> {tp.label} <span style={{ color: K.muted, fontSize: 12 }}>(interactive on the site)</span></div>
      )}
      {captions && cue && <div className="wt-caption" style={{ opacity: window01(t, cue.start, cue.end, 0.15) }}>{cue.text}</div>}
    </div>
  );
}
