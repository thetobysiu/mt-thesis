"use client";
import { useSyncExternalStore } from "react";
import { IconMoon, IconSun } from "./Icons";

const KEY = "mt-thesis-theme";
type Theme = "light" | "dark";

/** Inline in <head> so the stored theme applies before the first paint (dark unless the reader chose light). */
export const THEME_INIT = `try{var t=localStorage.getItem("${KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

const subscribe = (cb: () => void) => { window.addEventListener(KEY, cb); return () => window.removeEventListener(KEY, cb); };
const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "dark");
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(KEY));
  };
  return (
    <button className="btn btn-sm btn-ghost" onClick={toggle} aria-label={`Switch to the ${theme === "dark" ? "light" : "dark"} theme`}>
      {theme === "dark" ? <IconSun aria-hidden="true" /> : <IconMoon aria-hidden="true" />}
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
