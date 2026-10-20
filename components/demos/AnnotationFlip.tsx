"use client";
// The same three actions at turn 9 of the simple floor, as the engine annotated them before and after the repair of
// Table 6.5 (row 2 → row 4). The lines are cut from the stored observations; the outcomes are the exact state values.
import { useState } from "react";

export type FlipAction = { key: string; label: string; one: string[]; two: string[]; outcome: string; good: boolean };

export function AnnotationFlip({ actions, choseOne, choseTwo }: { actions: FlipAction[]; choseOne: string; choseTwo: string }) {
  const [two, setTwo] = useState(false);
  const [reveal, setReveal] = useState(false);
  const chose = two ? choseTwo : choseOne;
  return (
    <div className="flex flex-col gap-3 h-full min-h-0" data-demo data-testid="annotation-flip">
      <div className="flex flex-wrap items-center gap-2">
        <div className="tabs" role="tablist" aria-label="annotation version">
          <button role="tab" aria-selected={!two} className="btn btn-sm" onClick={() => setTwo(false)}>one-sided (row 2)</button>
          <button role="tab" aria-selected={two} className="btn btn-sm" onClick={() => setTwo(true)}>two-sided (row 4)</button>
        </div>
        <button className="btn btn-sm" onClick={() => setReveal((r) => !r)}>{reveal ? "hide" : "show"} the exact outcome</button>
        <span className="text-[13px] muted ml-auto">Qwen3.5-397B, same state: hero at (1,10), 336 HP, ATK 9, DEF 5, two yellow keys</span>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-auto">
        {actions.map((a) => {
          const picked = a.key === chose;
          return (
            <div key={a.key} className={`panel p-3 flex flex-col gap-1 ${picked ? "ring-2 ring-[var(--gold)]" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[14px]">{a.label}</b>
                {picked && <span className="tag tag-warn">the model chose this</span>}
                {reveal && <span className={`tag ml-auto ${a.good ? "tag-ok" : "tag-bad"}`}>{a.outcome}</span>}
              </div>
              {(two ? a.two : a.one).map((l, i) => (
                <code key={i} className={`mono text-[12.5px] whitespace-pre-wrap ${/net [+]/.test(l) ? "text-[var(--ok)]" : /net -/.test(l) ? "text-[var(--bad)]" : "muted"}`}>{l}</code>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-[13px] muted m-0">
        One-sided: the larger saving points to the door (7,5), and the potion behind the Slime Lord makes its effective cost −195. Two-sided:
        the cost of reaching the gems is stated, the balance points to the door (7,0), and the order line prices the Slime Lord. Outcomes:
        exact state value after the action (Listing 6.1).
      </p>
    </div>
  );
}
