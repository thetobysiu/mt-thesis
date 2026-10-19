import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AppShell } from "@/components/AppShell";
import { THEME_INIT } from "@/components/ThemeToggle";
import { SITE, SITE_URL } from "@/lib/site";
// fonts are bundled with the site (all subsets; the browser fetches only the ranges a page uses)
import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/fira-code/400.css";
import "@fontsource/fira-code/600.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: `${SITE.title}. ${SITE.degree}, ${SITE.university}: replays of every episode, the results behind each table, the exact solver and the prompt-optimisation runs.`,
  authors: [{ name: SITE.author }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <AppShell footer={
          <footer className="site-footer">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>{SITE.author} · {SITE.degree} · {SITE.university} · {SITE.status}</span>
              <span>Code MIT · text and data CC BY 4.0 · game tiles BSD-3 (mota-js)</span>
              <a className="link" href={SITE.labRepo}>mt-ai-lab (framework and re-runs)</a>
              <a className="link" href={SITE.siteRepo}>source of this site</a>
            </div>
          </footer>
        }>
          {children}
        </AppShell>
        <Analytics />
      </body>
    </html>
  );
}
