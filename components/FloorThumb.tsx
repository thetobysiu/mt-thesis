"use client";
// Small static map of a floor's start (floors index).
import { useMemo } from "react";
import { FloorMap } from "./FloorMap";
import { parseFloor } from "@/lib/engine/floor";
import { floorMapData } from "@/lib/engine/mapdata";

export function FloorThumb({ id, text, cell = 16 }: { id: string; text: string; cell?: number }) {
  const map = useMemo(() => floorMapData(parseFloor(id, text)), [id, text]);
  const hero = map.hero ? { ...map.hero } : null;
  return <FloorMap map={map} hero={hero} cell={cell} skin="game" />;
}
