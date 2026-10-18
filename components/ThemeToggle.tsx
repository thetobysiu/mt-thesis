"use client";
import { useSyncExternalStore } from "react";

const KEY = "mt-thesis-theme";
type Theme = "light" | "dark";

/** Inline in <head> so the stored theme applies before the first paint. */
export const THEME_INIT = `try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){}`;

const subscribe = (cb: () => void) => { window.addEventListener(KEY, cb); return () => window.removeEventListener(KEY, cb); };
const current = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "light");
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(KEY));
  };
  return (
    <button className="btn btn-sm btn-ghost" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
      {theme === "dark" ? "light theme" : "dark theme"}
    </button>
  );
}
