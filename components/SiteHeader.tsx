"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, SITE } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  const path = usePathname() ?? "/";
  return (
    <header className="site-header">
      <Link href="/" className="heading text-[14px] whitespace-nowrap" title={SITE.title}>{SITE.name}</Link>
      <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`nav-link ${path.startsWith(n.href) ? "active" : ""}`}>{n.label}</Link>
        ))}
      </nav>
      <span className="ml-auto" />
      <ThemeToggle />
    </header>
  );
}
