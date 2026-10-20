"use client";
// The web defense deck: one slide mounted at a time on a 16:9 stage, keyboard and clicker navigation, an overview, a black
// screen, fullscreen, and a presenter window (notes, next slide, timer) kept in step over a BroadcastChannel.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Stage, useFullscreen } from "@/components/stage/Stage";
import { SLIDES, type SlideDef } from "./slides";
import type { PresentData } from "@/lib/present-shared";

const CHANNEL = "mt-thesis-present";
const FOOT = "King Wai Siu · Master's thesis defense · Leuphana University Lüneburg";

const subscribeHash = (cb: () => void) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); };
const readHash = () => window.location.hash;
const indexOf = (hash: string) => {
  const n = Number.parseInt(hash.replace(/^#/, ""), 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(SLIDES.length - 1, n - 1)) : 0;
};

/** Main slides are numbered from 1 (title and closing slide unnumbered); backups carry their own label. */
const LABELS: string[] = (() => {
  let n = 0;
  return SLIDES.map((s) => (s.backup ? `Backup ${s.backup}` : s.bare ? "" : String(++n)));
})();

function useDeckIndex() {
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const index = indexOf(hash);
  const channel = useRef<BroadcastChannel | null>(null);
  const setHash = useCallback((i: number) => {
    const next = `#${i + 1}`;
    if (window.location.hash === next) return;
    history.replaceState(null, "", next);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = (e: MessageEvent<{ i: number }>) => setHash(e.data.i);
    return () => { bc.close(); channel.current = null; };
  }, [setHash]);
  const go = useCallback((i: number) => {
    const v = Math.max(0, Math.min(SLIDES.length - 1, i));
    setHash(v);
    channel.current?.postMessage({ i: v });
  }, [setHash]);
  return { index, go };
}

export function SlideView({ s, i, data }: { s: SlideDef; i: number; data: PresentData }) {
  if (s.bare) return <>{s.render(data)}</>;
  return (
    <div className="slide" data-slide={s.id}>
      <div className="slide-head">
        <h2 className="slide-title">{s.title}</h2>
        {s.tag && <span className="slide-tag">{s.tag}</span>}
      </div>
      <div className="slide-rule" />
      <div className="slide-body">{s.render(data)}</div>
      <div className="slide-foot"><span>{FOOT}</span><span className="ml-auto mono">{LABELS[i]}</span></div>
    </div>
  );
}

/** Keys: PageDown/PageUp (clicker) always; arrows, Space, Home/End only outside a live demo; F, O, B, P, Esc. */
function useDeckKeys(index: number, go: (i: number) => void, extra: { fullscreen: () => void; overview: () => void; black: () => void; presenter?: () => void; escape: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t?.closest?.("input, select, textarea");
      const inDemo = !!t?.closest?.("[data-demo]") || typing;
      const onButton = t?.tagName === "BUTTON" || t?.tagName === "A";
      let handled = true;
      switch (e.key) {
        case "PageDown": go(index + 1); break;
        case "PageUp": go(index - 1); break;
        case "ArrowRight": case "ArrowDown": if (inDemo) handled = false; else go(index + 1); break;
        case "ArrowLeft": case "ArrowUp": if (inDemo) handled = false; else go(index - 1); break;
        case " ": if (inDemo || onButton) handled = false; else go(index + (e.shiftKey ? -1 : 1)); break;
        case "Home": if (inDemo) handled = false; else go(0); break;
        case "End": if (inDemo) handled = false; else go(SLIDES.length - 1); break;
        case "f": case "F": if (typing) handled = false; else extra.fullscreen(); break;
        case "o": case "O": if (typing) handled = false; else extra.overview(); break;
        case "b": case "B": case ".": if (typing) handled = false; else extra.black(); break;
        case "p": case "P": if (typing || !extra.presenter) handled = false; else extra.presenter(); break;
        case "Escape": extra.escape(); handled = false; break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, extra]);
}

function Overview({ index, go, close }: { index: number; go: (i: number) => void; close: () => void }) {
  return (
    <div className="deck-overview" role="list" aria-label="all slides">
      {SLIDES.map((s, i) => (
        <button key={s.id} role="listitem" aria-current={i === index} onClick={() => { go(i); close(); }}>
          <span className="n">{LABELS[i] || (i === 0 ? "title" : "end")}</span>
          <span className="text-[13px] leading-snug">{s.title}</span>
        </button>
      ))}
    </div>
  );
}

export function Deck({ data }: { data: PresentData }) {
  const presenter = useSyncExternalStore(() => () => {}, () => new URLSearchParams(window.location.search).has("presenter"), () => false);
  return presenter ? <PresenterView data={data} /> : <AudienceView data={data} />;
}

function AudienceView({ data }: { data: PresentData }) {
  const { index, go } = useDeckIndex();
  const { ref: hostRef, on: fsOn, toggle: fsToggle } = useFullscreen<HTMLDivElement>();
  const [overview, setOverview] = useState(false);
  const [black, setBlack] = useState(false);
  const [notes, setNotes] = useState(false);
  const openPresenter = useCallback(() => { window.open(`/present/?presenter#${index + 1}`, "mt-thesis-presenter", "width=1280,height=800"); }, [index]);
  const extra = useMemo(() => ({
    fullscreen: fsToggle, overview: () => setOverview((v) => !v), black: () => setBlack((v) => !v), presenter: openPresenter,
    escape: () => { setOverview(false); setBlack(false); },
  }), [fsToggle, openPresenter]);
  useDeckKeys(index, go, extra);
  const s = SLIDES[index];

  return (
    <div className="flex flex-col gap-3">
      <div className="deck-bar">
        <button className="btn btn-sm" onClick={() => go(index - 1)} disabled={index === 0} aria-label="previous slide">◀</button>
        <span className="mono text-[13px] w-28 text-center">{index + 1} / {SLIDES.length}</span>
        <button className="btn btn-sm" onClick={() => go(index + 1)} disabled={index === SLIDES.length - 1} aria-label="next slide">▶</button>
        <select className="input max-w-[420px]" value={index} onChange={(e) => go(Number(e.target.value))} aria-label="go to slide">
          {SLIDES.map((x, i) => <option key={x.id} value={i}>{LABELS[i] ? `${LABELS[i]} · ` : ""}{x.title}</option>)}
        </select>
        <span className="ml-auto" />
        <button className="btn btn-sm" onClick={() => setNotes((v) => !v)} aria-pressed={notes}>notes</button>
        <button className="btn btn-sm" onClick={() => setOverview((v) => !v)} aria-pressed={overview}>overview (O)</button>
        <button className="btn btn-sm" onClick={openPresenter}>presenter view (P)</button>
        <button className="btn btn-sm btn-primary" onClick={fsToggle}>{fsOn ? "exit fullscreen" : "fullscreen (F)"}</button>
      </div>
      {overview ? <Overview index={index} go={go} close={() => setOverview(false)} /> : (
        <div ref={hostRef} className="stage-host">
          <Stage label={`slide ${index + 1}: ${s.title}`}
                 overlay={black ? <div className="deck-black" onClick={() => setBlack(false)} /> : null}>
            <SlideView key={s.id} s={s} i={index} data={data} />
          </Stage>
        </div>
      )}
      {notes && !overview && <div className="panel p-4 notes text-[15px]">{s.notes}</div>}
      <p className="muted text-[13px] m-0">
        PageDown / PageUp or a clicker move between slides everywhere; arrows and Space move only when the focus is not inside a live demo.
        F fullscreen · O overview · B black screen · P presenter window with notes, next slide and timer.
      </p>
    </div>
  );
}

function useClock(start: number) {
  const [now, setNow] = useState(start);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function PresenterView({ data }: { data: PresentData }) {
  const { index, go } = useDeckIndex();
  const [started, setStarted] = useState(() => Date.now());
  const now = useClock(started);
  const extra = useMemo(() => ({ fullscreen: () => {}, overview: () => {}, black: () => {}, escape: () => {} }), []);
  useDeckKeys(index, go, extra);
  const s = SLIDES[index], next = SLIDES[index + 1];
  const el = Math.max(0, Math.floor((now - started) / 1000));
  return (
    <div className="fixed inset-0 z-40 bg-[var(--bg)] p-4 grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 overflow-auto">
      <div className="flex flex-col gap-3 min-h-0">
        <div className="flex items-center gap-3">
          <b className="mono text-[var(--gold)] text-[18px]">{LABELS[index] || "–"}</b>
          <span className="text-[16px] font-semibold truncate">{s.title}</span>
          <span className="ml-auto mono text-[22px]">{String(Math.floor(el / 60)).padStart(2, "0")}:{String(el % 60).padStart(2, "0")}</span>
          <button className="btn btn-sm" onClick={() => setStarted(Date.now())}>reset timer</button>
        </div>
        <Stage label="current slide"><SlideView key={s.id} s={s} i={index} data={data} /></Stage>
        <div className="flex gap-2">
          <button className="btn" onClick={() => go(index - 1)} disabled={index === 0}>◀ previous</button>
          <button className="btn btn-primary" onClick={() => go(index + 1)} disabled={!next}>next ▶</button>
          <span className="mono muted self-center">{index + 1} / {SLIDES.length} · {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 min-h-0">
        <span className="muted text-[13px]">Next: {next ? next.title : "end of the deck"}</span>
        {next && <div className="pointer-events-none opacity-90" aria-hidden="true"><Stage><SlideView key={next.id} s={next} i={index + 1} data={data} /></Stage></div>}
        <div className="panel p-4 notes flex-1 min-h-0 overflow-auto">{s.notes}</div>
      </div>
    </div>
  );
}
