import type { MetadataRoute } from "next";
import { getEpisodes, getFloors, getResults } from "@/lib/data";
import { TOWER_FLOORS } from "@/lib/floors";
import { GEPA_RUNS } from "@/lib/gepa";
import { NAV, SITE_URL } from "@/lib/site";
import { getThesisChapters } from "@/lib/thesis";
import { TOUR } from "@/lib/tour";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...NAV.flatMap((g) => g.items.map((i) => i.href)),
    ...TOUR.map((c) => `/tour/${c.slug}/`),
    ...getThesisChapters().map((c) => `/thesis/${c.slug}/`),
    ...GEPA_RUNS.map((r) => `/prompt-optimisation/${r.label}/`),
    ...getFloors().flatMap((f) => [`/floors/${f.id}/`, `/play/${f.id}/`]),
    ...TOWER_FLOORS.map((id) => `/floors/${id}/`),
    ...getResults().cells.map((c) => `/results/${encodeURIComponent(c.label)}/`),
    ...getEpisodes().episodes.map((e) => `/episodes/${e.id}/`),
  ];
  return [...new Set(paths)].map((p) => ({ url: `${SITE_URL}${p}` }));
}
