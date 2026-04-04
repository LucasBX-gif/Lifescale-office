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

export const PRIVATE_OFFICE_ZONE: ZoneDef = {
  id: "private-office",
  name: "Private Office",
  x: 0, y: 0, w: 300, h: 280,
  fill: "rgba(108, 99, 255, 0.22)",
  border: "rgba(140, 130, 255, 0.85)",
};

export const WAR_ROOM_ZONE: ZoneDef = {
  id: "war-room",
  name: "War Room",
  x: 440, y: 240, w: 320, h: 310,
  fill: "rgba(255, 80, 50, 0.2)",
  border: "rgba(255, 110, 80, 0.85)",
};

export const LOUNGE_ZONE: ZoneDef = {
  id: "lounge",
  name: "Lounge",
  x: 900, y: 560, w: 300, h: 240,
  fill: "rgba(30, 210, 140, 0.2)",
  border: "rgba(50, 220, 150, 0.85)",
};

export const PRIVATE_OFFICE_2_ZONE: ZoneDef = {
  id: "private-office-2",
  name: "Private Office 2",
  x: 900, y: 0, w: 300, h: 280,
  fill: "rgba(108, 99, 255, 0.22)",
  border: "rgba(140, 130, 255, 0.85)",
};

export const ZONES: ZoneDef[] = [
  PRIVATE_OFFICE_ZONE,
  WAR_ROOM_ZONE,
  LOUNGE_ZONE,
  PRIVATE_OFFICE_2_ZONE,
];

// Door for Office 1 — on the RIGHT wall (x = 300)
export const DOOR = {
  x: 286,
  y: 110,
  w: 28,
  h: 60,
} as const;

// Door for Office 2 — on the LEFT wall (x = 900), mirrored
export const DOOR_2 = {
  x: 886,
  y: 110,
  w: 28,
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
