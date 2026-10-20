"use client";
// A 16:9 stage: content is authored at 1280 × 720 px and scaled with CSS zoom, so maps, the solver graph and text measure in
// their own pixels at any size (no transform), and a 1920 × 1080 capture renders crisp text rather than a scaled bitmap.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const STAGE_W = 1280;
export const STAGE_H = 720;

/** Fullscreen on one element; `on` follows the browser (Esc, F11). */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(document.fullscreenElement != null && document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen?.();
  }, []);
  return { ref, on, toggle };
}

export function Stage({ children, overlay, className = "", label }: { children: ReactNode; overlay?: ReactNode; className?: string; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setZoom(el.clientWidth / STAGE_W || 1);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={`stage ${className}`} role="region" aria-label={label}>
      <div className="stage-canvas" style={{ width: STAGE_W, height: STAGE_H, zoom }}>{children}</div>
      {overlay}
    </div>
  );
}
