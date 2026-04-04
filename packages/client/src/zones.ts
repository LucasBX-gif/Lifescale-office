import { Position2D } from "@lifescale/shared";

export const CANVAS_W = 1200;
export const CANVAS_H = 800;

export interface ZoneDef {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  border: string;
}

export const ZONES: ZoneDef[] = [
  {
    id: "private-office",
    name: "Private Office",
    x: 0, y: 0, w: 300, h: 280,
    fill: "rgba(108, 99, 255, 0.18)",
    border: "rgba(108, 99, 255, 0.7)",
  },
  {
    id: "war-room",
    name: "War Room",
    x: 440, y: 240, w: 320, h: 310,
    fill: "rgba(255, 100, 80, 0.15)",
    border: "rgba(255, 100, 80, 0.65)",
  },
  {
    id: "lounge",
    name: "Lounge",
    x: 900, y: 560, w: 300, h: 240,
    fill: "rgba(50, 200, 140, 0.15)",
    border: "rgba(50, 200, 140, 0.65)",
  },
];

// The door lives in the right wall of Private Office
export const PRIVATE_OFFICE_ZONE = ZONES[0];
export const WAR_ROOM_ZONE = ZONES[1];

export const DOOR = {
  x: 286,   // overlaps the right wall of Private Office (x=300)
  y: 110,
  w: 28,    // extends slightly either side of the wall line
  h: 60,
} as const;

/** Returns the zone name for pixel-space coordinates, or "Open Floor". */
export function detectZone(px: number, py: number): string {
  for (const z of ZONES) {
    if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z.name;
  }
  return "Open Floor";
}

export function pctToPx(pos: Position2D): { x: number; y: number } {
  return { x: (pos.x / 100) * CANVAS_W, y: (pos.y / 100) * CANVAS_H };
}

export function pxToPct(x: number, y: number): Position2D {
  return {
    x: Math.round((x / CANVAS_W) * 100 * 10) / 10,
    y: Math.round((y / CANVAS_H) * 100 * 10) / 10,
  };
}
