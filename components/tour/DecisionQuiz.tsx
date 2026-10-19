"use client";
// The first decision on the simple floor as a question: the engine has collected the key; four actions are legal.
// After a guess, the exact solver (in a worker, simple floor only) gives the best final HP still reachable after each.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FloorMap, useMapSkin } from "@/components/FloorMap";
import { parseFloor } from "@/lib/engine/floor";
import { floorMapData, heroOf } from "@/lib/engine/mapdata";
import { GameState, posKey, type Action } from "@/lib/engine/state";
import { stateText } from "@/lib/solver/solver";
import { stateValues } from "@/lib/solver/client";

function untilDecision(s: GameState): GameState {
  let cur = s;
  for (let guard = 0; guard < 200 && !cur.goalReached && !cur.failed; guard++) {
    const a = cur.assist();
    if (!a || "stuck" in a) break;
    const next = cur.clone();
    next.apply(a.action);
    cur = next;
  }
  return cur;
}

export function DecisionQuiz({ text, replayHref }: { text: string; replayHref: string | null }) {
  const floor = useMemo(() => parseFloor("simple", text), [text]);
  const map = useMemo(() => floorMapData(floor), [floor]);
  const state = useMemo(() => untilDecision(new GameState(floor)), [floor]);
  const actions = useMemo(() => state.actions(), [state]);
  const [skin] = useMapSkin();
  const [picked, setPicked] = useState<number | null>(null);
  const [values, setValues] = useState<(number | null)[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // after each action, the engine's assists run until the next decision; the value is that state's optimum
  const outcomes = useMemo(() => actions.map((a) => { const n = state.clone(); n.apply(a); return untilDecision(n); }), [actions, state]);
  useEffect(() => {
    if (picked == null || values) return;
    let live = true;
    const texts = outcomes.map((s) => (s.goalReached || s.failed ? null : stateText(floor.text, floor.height, s.hero, s.removed)));
    stateValues(texts.filter((t): t is string => !!t)).then((vals) => {
      if (!live) return;
      let k = 0;
      setValues(outcomes.map((s, i) => (texts[i] ? vals[k++] : s.goalReached ? s.hero.hp : null)));
    }).catch((e: unknown) => { if (live) setError(String(e)); });
    return () => { live = false; };
  }, [picked, values, outcomes, floor]);

  const highlight = useMemo(() => new Set(actions.map((a) => posKey(a.x, a.y))), [actions]);
  const labels = useMemo(() => Object.fromEntries(actions.map((a, i) => [posKey(a.x, a.y), String(i + 1)])), [actions]);
  const choose = (i: number) => { if (picked == null) setPicked(i); };
  const onCell = (x: number, y: number) => { const i = actions.findIndex((a) => a.x === x && a.y === y); if (i >= 0) choose(i); };
  const h = state.hero;
  const describe = (a: Action) => a.type === "fight" ? `${a.damage} HP` : a.type === "door" ? "uses a yellow key" : "";

  return (
    <div className="grid gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" data-testid="decision-quiz">
      <div className="panel p-3 min-h-[360px] flex flex-col gap-2">
        <div className="text-[13px] mono muted">HP {h.hp} · ATK {h.atk} · DEF {h.def} · yellow keys {h.yellow} · at ({h.x},{h.y})</div>
        <div className="flex-1 min-h-[320px]">
          <FloorMap map={map} hero={heroOf(state)} removed={state.removed} fit minCell={18} maxCell={52}
                    highlight={highlight} labels={labels} onCellClick={onCell} skin={skin} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[14px]">
          The engine has picked up the key next to the start. Four actions are legal. Which one would you take?
        </p>
        {actions.map((a, i) => {
          const v = values?.[i];
          const reveal = picked != null && values != null;
          const tone = !reveal ? "" : v == null ? "border-[var(--bad)]" : "border-[var(--ok)]";
          return (
            <button key={a.id} onClick={() => choose(i)} disabled={picked != null && picked !== i && !reveal}
                    className={`panel p-3 text-left flex flex-col gap-1 ${tone} ${picked === i ? "ring-2 ring-[var(--gold)]" : ""} ${picked == null ? "cursor-pointer hover:border-[var(--gold)]" : ""}`}>
              <span className="flex items-center gap-2">
                <span className="tag">{i + 1}</span>
                <b className="text-[14px]">{a.label.replace(/ dmg=\d+$/, "")}</b>
                <span className="muted text-[13px] ml-auto">{describe(a)}</span>
              </span>
              {reveal && (
                <span className={`text-[13px] ${v == null ? "text-[var(--bad)]" : "text-[var(--ok)]"}`}>
                  {v == null ? "The boss can no longer be defeated, whatever follows." : `Best final HP still reachable: ${v} (the optimum).`}
                </span>
              )}
            </button>
          );
        })}
        {picked != null && !values && !error && <p className="muted text-[13px]">The exact solver is checking all four outcomes…</p>}
        {error && <p className="text-[var(--bad)] text-[13px]">The solver failed: {error}</p>}
        {values && (
          <div className="panel p-3 text-[14px] flex flex-col gap-2">
            <p>
              {values[picked!] == null ? "That move loses the floor, although it looks reasonable." : "Correct: that is the only move that keeps the floor winnable."}
              {" "}Only the Black Slime (6,4) keeps the optimum of 13 HP. The Red Slime (5,3) costs one HP more and opens nothing the Black Slime
              does not; the Slime Lord (4,2) takes a quarter of the HP; the door (7,0) spends the only key, and the door behind it needs another.
            </p>
            <p className="muted text-[13px]">At this turn, 19 of the 20 episodes of the re-run chose the Black Slime (Section 6.4).</p>
            <div className="flex flex-wrap gap-2">
              {replayHref && <Link className="btn btn-sm" href={replayHref}>see what Qwen3.5-397B reasoned here</Link>}
              <Link className="btn btn-sm" href="/play/simple/">play the floor yourself</Link>
              <button className="btn btn-sm" onClick={() => { setPicked(null); }}>try again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
