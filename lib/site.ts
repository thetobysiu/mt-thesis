export const SITE = {
  name: "Magic Tower AI Lab · Thesis",
  title: "From Reactive Control to Holistic Planning: Evolutionary Prompt Optimization for Hybrid Deterministic-Neural Agents in Long-Horizon Environments",
  author: "King Wai Siu",
  email: "king.w.siu@stud.leuphana.de",
  university: "Leuphana University Lüneburg",
  supervisors: ["Prof. Dr. Ricardo Usbeck", "Prof. Dr. Burkhardt Funk"],
  degree: "Master's thesis, M.Sc. Data Science",
  status: "submitted, not yet graded",
  labRepo: "https://github.com/thetobysiu/mt-ai-lab",
  siteRepo: "https://github.com/thetobysiu/mt-thesis",
};

/** Public origin: NEXT_PUBLIC_SITE_URL, else Vercel's production domain (set at build time on Vercel), else the default domain. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://mt-thesis.vercel.app")).replace(/\/$/, "");

export const BIBTEX = `@mastersthesis{siu2026magictower,
  author = {Siu, King Wai},
  title  = {${SITE.title}},
  school = {${SITE.university}},
  type   = {Master's thesis (M.Sc. Data Science)},
  year   = {2026},
  note   = {Submitted, not yet graded},
  url    = {${SITE.siteRepo}}
}`;

export type NavItem = { href: string; label: string; icon: string; ready: boolean };

// Pages not built yet stay visible (marked "soon") so the site's structure is clear from the start.
export const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ href: "/", label: "Start", icon: "home", ready: true }] },
  { group: "Story", items: [
    { href: "/tour/", label: "Guided tour", icon: "compass", ready: true },
    { href: "/journey/", label: "Journey", icon: "route", ready: true },
  ] },
  { group: "Evidence", items: [
    { href: "/results/", label: "Results", icon: "table", ready: true },
    { href: "/episodes/", label: "Episodes", icon: "replay", ready: true },
    { href: "/compare/", label: "Compare", icon: "compare", ready: true },
  ] },
  { group: "Explore", items: [
    { href: "/floors/", label: "Floors", icon: "map", ready: true },
    { href: "/solver/", label: "Exact solver", icon: "target", ready: true },
    { href: "/prompt-optimisation/", label: "Prompt optimisation", icon: "dna", ready: true },
  ] },
  { group: "Play", items: [
    { href: "/play/", label: "Play", icon: "gamepad", ready: true },
    { href: "/tower/", label: "Tower Game", icon: "tower", ready: true },
  ] },
  { group: "Read", items: [
    { href: "/thesis/", label: "Thesis", icon: "book", ready: true },
    { href: "/glossary/", label: "Glossary", icon: "file", ready: true },
    { href: "/about/", label: "About", icon: "info", ready: true },
  ] },
];

/** Breadcrumb labels of the first path segment. */
export const SECTION_LABELS: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).filter((i) => i.href !== "/").map((i) => [i.href.replaceAll("/", ""), i.label]),
);
