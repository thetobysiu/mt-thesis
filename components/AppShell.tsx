"use client";
// App shell (as in mt-ai-lab's dashboard): grouped left rail, topbar with breadcrumbs and theme switch.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ComponentType, type SVGProps } from "react";
import { NAV, SECTION_LABELS, SITE } from "@/lib/site";
import { TOUR } from "@/lib/tour";
import {
  IconBook, IconChevronRight, IconCompare, IconCompass, IconDna, IconFile, IconGamepad, IconHome, IconInfo, IconMap, IconMenu,
  IconPanel, IconPlay, IconReplay, IconRoute, IconTable, IconTarget, IconTower,
} from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  home: IconHome, compass: IconCompass, route: IconRoute, table: IconTable, replay: IconReplay, compare: IconCompare, map: IconMap, target: IconTarget,
  dna: IconDna, tower: IconTower, gamepad: IconGamepad, book: IconBook, file: IconFile, info: IconInfo, play: IconPlay, panel: IconPanel,
};

const RAIL_KEY = "mt-thesis-rail";
const subscribe = (cb: () => void) => { window.addEventListener(RAIL_KEY, cb); return () => window.removeEventListener(RAIL_KEY, cb); };
const readCollapsed = () => localStorage.getItem(RAIL_KEY) === "1";

function Crumbs({ path }: { path: string }) {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return <span className="crumbs"><span className="here">{SITE.name}</span></span>;
  const section = parts[0];
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link href="/">Start</Link>
      <IconChevronRight />
      {parts.length === 1
        ? <span className="here" aria-current="page">{SECTION_LABELS[section] ?? section}</span>
        : <>
            <Link href={`/${section}/`}>{SECTION_LABELS[section] ?? section}</Link>
            <IconChevronRight />
            <span className={`here ${section === "tour" || section === "thesis" ? "" : "mono"}`} aria-current="page">
              {section === "tour" ? TOUR.find((c) => c.slug === parts[1])?.title ?? parts[1]
                : section === "thesis" ? parts[1].replace(/^appendix-([a-g])$/, (_m, l: string) => `Appendix ${l.toUpperCase()}`).replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
                : decodeURIComponent(parts[parts.length - 1])}
            </span>
          </>}
    </nav>
  );
}

export function AppShell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [open, setOpen] = useState(false);
  const toggle = () => { localStorage.setItem(RAIL_KEY, collapsed ? "0" : "1"); window.dispatchEvent(new Event(RAIL_KEY)); };
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.replace(/\/$/, "")));

  return (
    <div className={`app ${collapsed ? "collapsed" : ""} ${open ? "open" : ""}`}>
      <aside className="rail" aria-label="Site navigation">
        <Link href="/" className="brand" onClick={() => setOpen(false)} title={SITE.title}>
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#15803D" />
            <path d="M10 26V12l2-3h2v3h4V9h2l2 3v14z" fill="#FBBF24" />
            <rect x="14" y="19" width="4" height="7" fill="#15803D" />
          </svg>
          <span className="brand-name">Magic Tower AI Lab<small>Thesis</small></span>
        </Link>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {NAV.map((g, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {g.group && <div className="rail-group">{g.group}</div>}
              {g.items.map((it) => {
                const Icon = ICONS[it.icon] ?? IconFile;
                if (!it.ready) {
                  return (
                    <span key={it.href} className="nav-link disabled" title={`${it.label}: coming soon`} aria-disabled="true">
                      <Icon aria-hidden="true" /><span className="label">{it.label}</span><span className="soon">soon</span>
                    </span>
                  );
                }
                const active = isActive(it.href);
                return (
                  <Link key={it.href} href={it.href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}
                        title={it.label} onClick={() => setOpen(false)}>
                    <Icon aria-hidden="true" /><span className="label">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button className="nav-link rail-toggle mt-auto" onClick={toggle} aria-expanded={!collapsed}
                title={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}>
          <IconPanel aria-hidden="true" /><span className="label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      </aside>
      <div className="min-w-0 flex flex-col">
        <header className="topbar">
          <button className="btn btn-sm btn-ghost menu-btn" onClick={() => setOpen((v) => !v)} aria-label="Open the menu" aria-expanded={open}>
            <IconMenu aria-hidden="true" />
          </button>
          <Crumbs path={path} />
          <span className="ml-auto" />
          <ThemeToggle />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
        {footer}
      </div>
      {open && <button className="scrim" aria-label="Close the menu" onClick={() => setOpen(false)} />}
    </div>
  );
}
