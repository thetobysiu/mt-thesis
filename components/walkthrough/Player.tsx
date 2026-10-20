"use client";
// The 3-minute walkthrough player: a clock drives the scenes; captions, generated music, chapters and pause-and-try moments
// that open a live demo on the same canvas. `?capture` renders bare frames for scripts/capture-walkthrough.ts.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Stage, useFullscreen } from "@/components/stage/Stage";
import { DamageCalc } from "@/components/tour/DamageCalc";
import { DecisionQuiz } from "@/components/tour/DecisionQuiz";
import { SolverExplorer } from "@/components/SolverExplorer";
import { AnnotationFlip } from "@/components/demos/AnnotationFlip";
import { TurnScene } from "@/components/demos/TurnScene";
import { IconPause, IconPlay, IconExpand } from "@/components/Icons";
import { WalkthroughFrame, useSceneData } from "./Scenes";
import { CHAPTERS, DURATION, TRIES, chapterAt, clampT, type TryPoint } from "@/lib/walkthrough";
import { encodeWav, renderMusic, scheduleMusic } from "@/lib/music";
import { fmtTime } from "@/lib/stage";
import type { PresentData } from "@/lib/present-shared";

const noop = () => () => {};
const readQuery = (k: string) => () => new URLSearchParams(window.location.search).get(k);

export function WalkthroughPlayer({ data, siteUrl }: { data: PresentData; siteUrl: string }) {
  const capture = useSyncExternalStore(noop, readQuery("capture"), () => null);
  return capture != null ? <CaptureView data={data} siteUrl={siteUrl} /> : <LivePlayer data={data} siteUrl={siteUrl} />;
}

declare global {
  interface Window { __walkthrough?: { duration: number; setTime: (t: number) => Promise<void>; music: (rate?: number) => Promise<string> } }
}

const toBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

function CaptureView({ data, siteUrl }: { data: PresentData; siteUrl: string }) {
  const s = useSceneData(data, siteUrl);
  const captions = useSyncExternalStore(noop, readQuery("captions"), () => null) !== "0";
  const [t, setT] = useState(0);
  useEffect(() => {
    document.documentElement.classList.add("capture");
    window.__walkthrough = {
      duration: DURATION,
      setTime: (x) => new Promise((res) => { flushSync(() => setT(clampT(x))); requestAnimationFrame(() => requestAnimationFrame(() => res())); }),
      music: async (rate = 24000) => toBase64(encodeWav(await renderMusic(rate))),
    };
    return () => { document.documentElement.classList.remove("capture"); delete window.__walkthrough; };
  }, []);
  return (
    <div className="fixed inset-0 z-[60] bg-black" data-testid="walkthrough-capture">
      <Stage label="walkthrough frame" className="wt-capture"><WalkthroughFrame t={t} s={s} captions={captions} live={false} /></Stage>
    </div>
  );
}

type Audio = { ctx: AudioContext | null; stop: (() => void) | null };

function LivePlayer({ data, siteUrl }: { data: PresentData; siteUrl: string }) {
  const s = useSceneData(data, siteUrl);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState(true);
  const [trying, setTrying] = useState<TryPoint | null>(null);
  const clock = useRef({ t0: 0, wall: 0 });
  const audio = useRef<Audio>({ ctx: null, stop: null });
  const tRef = useRef(0);
  const { ref: hostRef, on: fsOn, toggle: fsToggle } = useFullscreen<HTMLDivElement>();
  useEffect(() => { tRef.current = t; }, [t]);

  const stopMusic = useCallback(() => { audio.current.stop?.(); audio.current.stop = null; }, []);
  const startMusic = useCallback((from: number) => {
    stopMusic();
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = audio.current.ctx ?? new AC();
    audio.current.ctx = ctx;
    void ctx.resume();
    audio.current.stop = scheduleMusic(ctx, ctx.destination, from, ctx.currentTime + 0.05);
  }, [stopMusic]);

  const play = useCallback((from?: number) => {
    const start = from ?? (tRef.current >= DURATION - 0.05 ? 0 : tRef.current);
    clock.current = { t0: start, wall: performance.now() };
    setT(start);
    setPlaying(true);
    setTrying(null);
    if (music) startMusic(start);
  }, [music, startMusic]);
  const pause = useCallback(() => { setPlaying(false); stopMusic(); }, [stopMusic]);
  const seek = useCallback((x: number) => {
    const v = clampT(x);
    setT(v);
    if (playing) { clock.current = { t0: v, wall: performance.now() }; if (music) startMusic(v); }
  }, [playing, music, startMusic]);
  const toggleMusic = useCallback(() => {
    if (music) stopMusic(); else if (playing) startMusic(tRef.current);
    setMusic(!music);
  }, [music, playing, startMusic, stopMusic]);
  const openTry = useCallback((p: TryPoint) => { pause(); setTrying(p); }, [pause]);

  useEffect(() => {
    if (!playing) return;
    let id = 0;
    const tick = () => {
      const nt = clock.current.t0 + (performance.now() - clock.current.wall) / 1000;
      if (nt >= DURATION) { setT(DURATION); setPlaying(false); stopMusic(); return; }
      setT(nt);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing, stopMusic]);
  useEffect(() => {
    const a = audio.current;
    return () => { a.stop?.(); void a.ctx?.close(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("input:not([type=range]), select, textarea, [data-demo], .wt-try")) { if (e.key === "Escape") setTrying(null); return; }
      let handled = true;
      switch (e.key) {
        case " ": case "k": case "K": if (el?.tagName === "BUTTON") { handled = false; break; } if (playing) pause(); else play(); break;
        case "ArrowLeft": case "j": case "J": seek(tRef.current - (e.key === "ArrowLeft" ? 5 : 10)); break;
        case "ArrowRight": case "l": case "L": seek(tRef.current + (e.key === "ArrowRight" ? 5 : 10)); break;
        case "Home": seek(0); break;
        case "End": seek(DURATION); break;
        case "c": case "C": setCaptions((v) => !v); break;
        case "m": case "M": toggleMusic(); break;
        case "f": case "F": fsToggle(); break;
        case "Escape": setTrying(null); handled = false; break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, play, pause, seek, toggleMusic, fsToggle]);

  const ch = chapterAt(t);
  const controls = (
    <div className={`wt-controls ${playing ? "" : "show"}`} onClick={(e) => e.stopPropagation()}>
      <div className="wt-track">
        {CHAPTERS.slice(1).map((c) => <span key={c.id} className="wt-mark" style={{ left: `${(c.start / DURATION) * 100}%` }} />)}
        {TRIES.map((p) => <span key={p.id} className="wt-mark try" style={{ left: `${(p.at / DURATION) * 100}%` }} title={p.label} />)}
        <input type="range" min={0} max={DURATION} step={0.1} value={t} onChange={(e) => seek(Number(e.target.value))} aria-label="position" />
      </div>
      <div className="flex items-center gap-2 text-[13px]">
        <button className="btn btn-sm" onClick={() => (playing ? pause() : play())} aria-label={playing ? "pause" : "play"}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <span className="mono">{fmtTime(t)} / {fmtTime(DURATION)}</span>
        <span className="truncate opacity-80">· {ch.title}</span>
        <span className="ml-auto" />
        <button className="btn btn-sm" onClick={() => setCaptions((v) => !v)} aria-pressed={captions} title="captions (C)">CC</button>
        <button className="btn btn-sm" onClick={toggleMusic} aria-pressed={music} title="music (M)">{music ? "music on" : "music off"}</button>
        <button className="btn btn-sm" onClick={fsToggle} aria-label={fsOn ? "exit fullscreen" : "fullscreen"} title="fullscreen (F)"><IconExpand /></button>
      </div>
    </div>
  );

  const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, .wt-try, [data-demo]")) return;
    if (playing) pause(); else play();
  };

  return (
    <div className="flex flex-col gap-3" data-testid="walkthrough">
      <div ref={hostRef} className="stage-host" onClick={onStageClick}>
        <Stage label="the thesis in three minutes" overlay={trying ? null : controls}>
          <WalkthroughFrame t={t} s={s} captions={captions} live onTry={openTry} />
          {!playing && t === 0 && !trying && (
            <button className="absolute inset-0 m-auto w-[120px] h-[120px] rounded-full flex items-center justify-center text-[#0B1220] bg-[#F5B83D] shadow-xl"
                    style={{ zIndex: 5 }} onClick={() => play()} aria-label="play the walkthrough">
              <IconPlay width={52} height={52} />
            </button>
          )}
          {trying && <TryOverlay p={trying} data={data} onBack={() => play()} onClose={() => setTrying(null)} />}
        </Stage>
      </div>
      <div className="flex flex-wrap gap-2">
        {CHAPTERS.map((c, i) => (
          <button key={c.id} className={`btn btn-sm ${ch.id === c.id ? "btn-primary" : ""}`} onClick={() => play(c.start)}>
            <span className="mono opacity-70">{fmtTime(c.start)}</span> {i ? c.title : "Start"}
          </button>
        ))}
      </div>
      <p className="muted text-[13px] m-0">
        Space play/pause · ←/→ 5 s · C captions · M music · F fullscreen. The gold dots and the chip in the corner mark moments to pause and try the
        demo yourself; &quot;back to the walkthrough&quot; resumes where you left.
      </p>
    </div>
  );
}

function TryOverlay({ p, data, onBack, onClose }: { p: TryPoint; data: PresentData; onBack: () => void; onClose: () => void }) {
  const body = useMemo((): ReactNode => {
    switch (p.demo) {
      case "damage": return <div className="overflow-auto h-full" data-demo><DamageCalc text={data.simple.text} /></div>;
      case "decision": return <DecisionQuiz text={data.simple.text} replayHref={null} fill />;
      case "solver": return <SolverExplorer layout="stage" floors={[{ id: "simple", title: "Simple floor (live search)", text: data.simple.text, optimum: data.simple.optimum, published: data.simple.published }]} />;
      case "flip": return data.flip ? <AnnotationFlip {...data.flip} /> : null;
      case "complex": return data.picks.complexLoss ? <TurnScene key="complex" id={data.picks.complexLoss.id} turn={data.picks.complexLoss.turn} tab="observation"
        note="Qwen3.5-397B, single-floor prompt: the Red Slime (11,8), after which the boss is unwinnable" /> : null;
      case "site": return <SiteLinks />;
    }
  }, [p.demo, data]);
  return (
    <div className="wt-try" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <b className="text-[18px]">{p.label}</b>
        <span className="ml-auto" />
        <button className="btn btn-sm" onClick={onClose}>close</button>
        <button className="btn btn-sm btn-primary" onClick={onBack}>back to the walkthrough ▶</button>
      </div>
      <div className="flex-1 min-h-0">{body}</div>
    </div>
  );
}

const LINKS: [string, string, string][] = [
  ["/present/", "Presentation", "the defense slides with live demos"], ["/episodes/", "Episodes", "every stored episode, turn by turn"],
  ["/compare/", "Compare", "a win and a loss where they first differ"], ["/solver/", "BFS solver", "the exact search; 22 vs. 68"],
  ["/results/", "Results", "every cell behind the thesis tables"], ["/prompt-optimisation/", "Prompt optimisation", "every candidate, diagnosis and verdict"],
  ["/play/", "Play", "any floor with the exact value of every action"], ["/game/", "Tower game", "the original 24-floor game"],
  ["/thesis/", "Thesis", "the full text and the PDF"],
];
function SiteLinks() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {LINKS.map(([href, t, sub]) => (
        <Link key={href} href={href} className="sl-card hover:border-[var(--gold)]" style={{ textDecoration: "none" }}>
          <span className="t">{t}</span><span className="text-[14px] muted">{sub}</span>
        </Link>
      ))}
    </div>
  );
}
