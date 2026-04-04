import { useEffect, useRef, useCallback } from "react";
import { Room, Position2D, UserStatus, User } from "@lifescale/shared";
import {
  CANVAS_W, CANVAS_H, ZONES, DOOR,
  PRIVATE_OFFICE_ZONE, detectZone, pctToPx, pxToPct,
} from "../zones";

const AVATAR_R = 20;
const SPEED = 260;
const LERP_SPEED = 12;

const STATUS_COLORS: Record<UserStatus, string> = {
  available:   "#3dffa0",
  "deep-work": "#ff6464",
  "on-a-call": "#ffbe32",
};

// ─── Theme palettes ────────────────────────────────────────────────────────────
function palette(isDark: boolean) {
  return isDark ? {
    // Base
    bg:            "#0a0a14",
    tile1:         "#0c0c1a",
    tile2:         "#0e0e1e",
    grout:         "rgba(255,255,255,0.025)",
    // Room floors
    wood1:         "rgba(100,65,30,0.55)",
    wood2:         "rgba(115,75,38,0.5)",
    woodGrain:     "rgba(60,35,10,0.25)",
    warmCarpet:    "rgba(90,22,18,0.6)",
    warmCarpetAlt: "rgba(80,18,14,0.6)",
    warmCarpetLine:"rgba(160,50,35,0.06)",
    coolCarpet:    "rgba(14,70,58,0.6)",
    coolCarpetAlt: "rgba(12,62,50,0.6)",
    coolCarpetLine:"rgba(30,140,110,0.06)",
    // Walls
    wallFill:      "#12121f",
    wallBorder:    "rgba(255,255,255,0.1)",
    // Lights
    lightGlow:     "rgba(255,240,190,0.06)",
    lightFixture:  "rgba(255,245,210,0.9)",
    lightRing:     "rgba(255,240,180,0.25)",
    // Zone labels
    zoneLabel:     "rgba(255,255,255,0.1)",
    // Avatar
    avatarFill:    "#252538",
    avatarMeFill:  "#6c63ff",
    label:         "rgba(255,255,255,0.85)",
    labelMuted:    "rgba(255,255,255,0.5)",
    indicator:     "rgba(10,10,22,0.85)",
    indicatorTxt:  "#e8e8f4",
    // Furniture
    deskDark:      "rgba(60,42,22,0.9)",
    deskMid:       "rgba(80,56,28,0.85)",
    deskLight:     "rgba(110,78,38,0.7)",
    deskEdge:      "rgba(140,100,50,0.5)",
    chairFill:     "rgba(28,28,48,0.9)",
    chairStroke:   "rgba(80,75,120,0.7)",
    screenFill:    "rgba(15,22,55,0.95)",
    screenGlow:    "rgba(60,110,255,0.5)",
    screenGlowOut: "rgba(60,110,255,0.08)",
    tableWar:      "rgba(55,35,18,0.9)",
    tableWarEdge:  "rgba(120,80,40,0.6)",
    chairWarFill:  "rgba(60,15,12,0.85)",
    chairWarStroke:"rgba(160,55,40,0.7)",
    sofaFill:      "rgba(18,62,50,0.9)",
    sofaStroke:    "rgba(35,140,110,0.6)",
    cushionFill:   "rgba(22,90,72,0.7)",
    coffeeTable:   "rgba(70,50,25,0.85)",
    tvFill:        "rgba(10,12,28,0.95)",
    tvScreen:      "rgba(25,50,160,0.5)",
    plantPot:      "rgba(80,48,20,0.8)",
    plantLeaf:     "rgba(25,140,55,0.8)",
    plantLeaf2:    "rgba(35,165,65,0.6)",
    bookShelf:     "rgba(55,38,18,0.85)",
    bookEdge:      "rgba(90,65,30,0.6)",
    rugWarm:       "rgba(108,99,255,0.08)",
    rugCool:       "rgba(30,210,140,0.08)",
    shadow:        "rgba(0,0,0,0.55)",
    doorFill:      "rgba(108,99,255,0.55)",
    doorText:      "rgba(140,130,255,0.9)",
    counterFill:   "rgba(50,50,80,0.7)",
    counterTop:    "rgba(70,70,110,0.6)",
    sinkFill:      "rgba(30,30,55,0.9)",
    glassBlue:     "rgba(80,160,240,0.35)",
    mugFill:       "rgba(220,180,80,0.7)",
    whiteboard:    "rgba(230,230,255,0.1)",
    whiteboardLine:"rgba(100,160,255,0.5)",
  } : {
    bg:            "#d4d4e8",
    tile1:         "#d8d8ec",
    tile2:         "#dcdcf2",
    grout:         "rgba(0,0,0,0.045)",
    wood1:         "rgba(160,110,55,0.55)",
    wood2:         "rgba(180,130,70,0.5)",
    woodGrain:     "rgba(110,72,25,0.2)",
    warmCarpet:    "rgba(160,50,40,0.35)",
    warmCarpetAlt: "rgba(145,42,34,0.35)",
    warmCarpetLine:"rgba(200,80,60,0.06)",
    coolCarpet:    "rgba(25,120,95,0.35)",
    coolCarpetAlt: "rgba(20,108,84,0.35)",
    coolCarpetLine:"rgba(40,170,140,0.06)",
    wallFill:      "#c8c8e0",
    wallBorder:    "rgba(0,0,0,0.18)",
    lightGlow:     "rgba(255,240,180,0.18)",
    lightFixture:  "rgba(200,180,80,0.9)",
    lightRing:     "rgba(220,200,100,0.35)",
    zoneLabel:     "rgba(0,0,0,0.1)",
    avatarFill:    "#8888bb",
    avatarMeFill:  "#5b52ee",
    label:         "rgba(14,14,40,0.9)",
    labelMuted:    "rgba(14,14,40,0.55)",
    indicator:     "rgba(200,200,230,0.9)",
    indicatorTxt:  "#14143a",
    deskDark:      "rgba(120,82,38,0.85)",
    deskMid:       "rgba(150,105,50,0.8)",
    deskLight:     "rgba(180,135,70,0.65)",
    deskEdge:      "rgba(200,160,90,0.5)",
    chairFill:     "rgba(50,50,90,0.75)",
    chairStroke:   "rgba(100,95,160,0.7)",
    screenFill:    "rgba(20,28,70,0.9)",
    screenGlow:    "rgba(50,90,220,0.45)",
    screenGlowOut: "rgba(50,90,220,0.07)",
    tableWar:      "rgba(100,65,30,0.85)",
    tableWarEdge:  "rgba(160,110,55,0.6)",
    chairWarFill:  "rgba(130,38,28,0.7)",
    chairWarStroke:"rgba(190,75,55,0.65)",
    sofaFill:      "rgba(22,100,78,0.75)",
    sofaStroke:    "rgba(30,160,120,0.6)",
    cushionFill:   "rgba(28,120,92,0.6)",
    coffeeTable:   "rgba(130,95,45,0.8)",
    tvFill:        "rgba(15,18,40,0.9)",
    tvScreen:      "rgba(35,60,180,0.45)",
    plantPot:      "rgba(120,75,30,0.75)",
    plantLeaf:     "rgba(30,160,60,0.75)",
    plantLeaf2:    "rgba(45,185,75,0.55)",
    bookShelf:     "rgba(100,70,30,0.8)",
    bookEdge:      "rgba(140,100,45,0.55)",
    rugWarm:       "rgba(108,99,255,0.07)",
    rugCool:       "rgba(30,210,140,0.07)",
    shadow:        "rgba(0,0,0,0.18)",
    doorFill:      "rgba(91,82,238,0.5)",
    doorText:      "rgba(91,82,238,0.9)",
    counterFill:   "rgba(160,160,200,0.6)",
    counterTop:    "rgba(180,180,220,0.55)",
    sinkFill:      "rgba(140,140,185,0.7)",
    glassBlue:     "rgba(70,140,220,0.3)",
    mugFill:       "rgba(200,150,40,0.75)",
    whiteboard:    "rgba(255,255,255,0.7)",
    whiteboardLine:"rgba(50,80,200,0.45)",
  };
}

type P = ReturnType<typeof palette>;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function shadow(ctx: CanvasRenderingContext2D, color: string, blur: number) {
  ctx.shadowColor = color; ctx.shadowBlur = blur;
}

function noShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
}

// ─── Background — polished tile floor ─────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, p: P) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const T = 80;
  for (let tx = 0; tx < CANVAS_W; tx += T) {
    for (let ty = 0; ty < CANVAS_H; ty += T) {
      if ((Math.floor(tx / T) + Math.floor(ty / T)) % 2 === 0) {
        ctx.fillStyle = p.tile2;
        ctx.fillRect(tx, ty, T, T);
      }
    }
  }
  ctx.strokeStyle = p.grout;
  ctx.lineWidth = 1;
  for (let tx = 0; tx <= CANVAS_W; tx += T) {
    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, CANVAS_H); ctx.stroke();
  }
  for (let ty = 0; ty <= CANVAS_H; ty += T) {
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(CANVAS_W, ty); ctx.stroke();
  }
}

// ─── Room floors ───────────────────────────────────────────────────────────────
function drawWoodFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: P) {
  ctx.fillStyle = p.wood1;
  ctx.fillRect(x, y, w, h);
  const plankH = 20;
  for (let py = y; py < y + h; py += plankH) {
    ctx.fillStyle = (Math.floor((py - y) / plankH) % 2 === 0) ? p.wood1 : p.wood2;
    ctx.fillRect(x, py, w, plankH);
    // Grain lines
    ctx.strokeStyle = p.woodGrain;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
    // Random knot/grain accent
    const kx = x + ((py * 37 + 131) % w);
    ctx.beginPath(); ctx.moveTo(kx, py + 4); ctx.lineTo(kx + 18, py + 10); ctx.stroke();
  }
}

function drawCarpet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c1: string, c2: string, line: string) {
  const step = 10;
  for (let tx = x; tx < x + w; tx += step) {
    for (let ty = y; ty < y + h; ty += step) {
      ctx.fillStyle = (Math.floor((tx - x) / step) + Math.floor((ty - y) / step)) % 2 === 0 ? c1 : c2;
      ctx.fillRect(tx, ty, step, step);
    }
  }
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.4;
  for (let tx = x; tx <= x + w; tx += step) {
    ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke();
  }
  for (let ty = y; ty <= y + h; ty += step) {
    ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke();
  }
}

// ─── Ceiling lights ────────────────────────────────────────────────────────────
function drawLights(ctx: CanvasRenderingContext2D, p: P) {
  const lights = [
    { x: 155, y: 130, r: 130 },   // Private Office
    { x: 580, y: 350, r: 140 },   // War Room left
    { x: 700, y: 430, r: 110 },   // War Room right
    { x: 1040, y: 640, r: 130 },  // Lounge
    { x: 380, y: 100, r: 90 },    // Open floor 1
    { x: 820, y: 160, r: 80 },    // Open floor 2
  ];
  for (const l of lights) {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, p.lightGlow);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    // Fixture dot
    ctx.beginPath(); ctx.arc(l.x, l.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.lightFixture;
    ctx.fill();
    ctx.beginPath(); ctx.arc(l.x, l.y, 9, 0, Math.PI * 2);
    ctx.strokeStyle = p.lightRing;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ─── Zones — walls & labels ───────────────────────────────────────────────────
function drawZones(ctx: CanvasRenderingContext2D, doorClosed: boolean, p: P) {
  const WT = 7; // wall thickness

  for (const z of ZONES) {
    // Floor texture
    if (z.id === "private-office") {
      drawWoodFloor(ctx, z.x, z.y, z.w, z.h, p);
    } else if (z.id === "war-room") {
      drawCarpet(ctx, z.x, z.y, z.w, z.h, p.warmCarpet, p.warmCarpetAlt, p.warmCarpetLine);
    } else if (z.id === "lounge") {
      drawCarpet(ctx, z.x, z.y, z.w, z.h, p.coolCarpet, p.coolCarpetAlt, p.coolCarpetLine);
    }

    // Zone label (subtle floor text)
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = p.zoneLabel;
    ctx.fillText(z.name.toUpperCase(), z.x + z.w / 2, z.y + z.h - 16);

    // Thick walls
    ctx.fillStyle = p.wallFill;
    if (z.id === "private-office") {
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w;
      // Top wall
      ctx.fillRect(x, y, w + WT, WT);
      // Left wall
      ctx.fillRect(x, y, WT, h);
      // Bottom wall
      ctx.fillRect(x, y + h, w + WT, WT);
      // Right wall (with door gap)
      ctx.fillRect(wallX, y, WT, DOOR.y - y);
      ctx.fillRect(wallX, DOOR.y + DOOR.h, WT, y + h - (DOOR.y + DOOR.h));
      drawDoor(ctx, doorClosed, p);
    } else {
      // Top
      ctx.fillRect(z.x, z.y, z.w, WT);
      // Bottom
      ctx.fillRect(z.x, z.y + z.h, z.w, WT);
      // Left
      ctx.fillRect(z.x, z.y, WT, z.h);
      // Right
      ctx.fillRect(z.x + z.w, z.y, WT, z.h + WT);
    }

    // Wall border highlight
    ctx.strokeStyle = z.border;
    ctx.lineWidth = 1;
    if (z.id === "private-office") {
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w;
      ctx.beginPath();
      ctx.moveTo(x + WT, y + WT); ctx.lineTo(x + w, y + WT);
      ctx.moveTo(wallX + WT, y + WT); ctx.lineTo(wallX + WT, DOOR.y);
      ctx.moveTo(wallX + WT, DOOR.y + DOOR.h); ctx.lineTo(wallX + WT, y + h);
      ctx.moveTo(x + w, y + h + WT); ctx.lineTo(x + WT, y + h + WT);
      ctx.moveTo(x + WT, y + h + WT); ctx.lineTo(x + WT, y + WT);
      ctx.stroke();
    } else {
      ctx.strokeRect(z.x + WT, z.y + WT, z.w - WT, z.h - WT);
    }
  }
}

// ─── Door ─────────────────────────────────────────────────────────────────────
function drawDoor(ctx: CanvasRenderingContext2D, closed: boolean, p: P) {
  const { y, h } = DOOR;
  const wallX = PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w;

  if (closed) {
    ctx.fillStyle = p.doorFill;
    rr(ctx, wallX - 10, y, 10, h, 2); ctx.fill();
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🔒", wallX - 5, y + h / 2);
  } else {
    ctx.strokeStyle = p.doorFill;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wallX, y);
    ctx.lineTo(wallX - 18, y + h * 0.65);
    ctx.stroke();
  }

  ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.fillStyle = p.doorText;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(closed ? "Open" : "Close", wallX + 10, y + h / 2);
}

// ─── Furniture ────────────────────────────────────────────────────────────────
function drawFurniture(ctx: CanvasRenderingContext2D, p: P) {

  // ══ PRIVATE OFFICE (0,0 → 300,280) ══════════════════════════════════════════

  // Floor rug
  ctx.fillStyle = p.rugWarm;
  rr(ctx, 16, 55, 270, 210, 8); ctx.fill();

  // ── Bookshelf — full left wall ───────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.bookShelf;
  rr(ctx, 8, 8, 34, 260, 2); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.bookEdge;
  ctx.lineWidth = 1;
  rr(ctx, 8, 8, 34, 260, 2); ctx.stroke();
  // Shelves
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = p.bookEdge;
    ctx.fillRect(8, 58 + i * 50, 34, 3);
  }
  // Books on each shelf
  const bookCols = ["#e05555","#6c63ff","#3dffa0","#ffbe32","#06b6d4","#a855f7","#ff8c42","#e05555","#3dffa0","#6c63ff"];
  for (let shelf = 0; shelf < 5; shelf++) {
    let bx = 10;
    const by = 10 + shelf * 50;
    for (let b = 0; b < 6 && bx < 40; b++) {
      const bw = 3 + (b * 7 + shelf * 3) % 3;
      ctx.fillStyle = bookCols[(shelf * 6 + b) % bookCols.length];
      ctx.fillRect(bx, by + 2, bw, 44);
      bx += bw + 1;
    }
  }

  // ── Executive L-desk ─────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 10);
  ctx.fillStyle = p.deskDark;
  rr(ctx, 55, 145, 195, 58, 4); ctx.fill();   // main desk surface
  rr(ctx, 55, 185, 64, 75, 4); ctx.fill();    // return (side piece)
  noShadow(ctx);
  // Surface highlight
  ctx.fillStyle = p.deskLight;
  rr(ctx, 58, 148, 189, 8, 2); ctx.fill();
  rr(ctx, 58, 188, 58, 8, 2); ctx.fill();
  // Edge trim
  ctx.strokeStyle = p.deskEdge;
  ctx.lineWidth = 1.5;
  rr(ctx, 55, 145, 195, 58, 4); ctx.stroke();
  rr(ctx, 55, 185, 64, 75, 4); ctx.stroke();
  // Drawer handles on return
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = p.deskEdge;
    rr(ctx, 76, 200 + i * 18, 20, 5, 2); ctx.fill();
  }

  // ── Monitor ───────────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 12);
  ctx.fillStyle = p.screenFill;
  rr(ctx, 100, 150, 86, 50, 3); ctx.fill();
  noShadow(ctx);
  // Screen glow
  ctx.fillStyle = p.screenGlowOut;
  rr(ctx, 95, 145, 96, 60, 5); ctx.fill();
  ctx.fillStyle = p.screenGlow;
  rr(ctx, 104, 153, 78, 42, 2); ctx.fill();
  // Screen content (fake window)
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  rr(ctx, 106, 155, 50, 20, 1); ctx.fill();
  rr(ctx, 106, 178, 30, 8, 1); ctx.fill();
  rr(ctx, 140, 178, 20, 8, 1); ctx.fill();
  // Monitor stand
  ctx.fillStyle = p.deskMid;
  ctx.fillRect(137, 200, 9, 8);
  ctx.fillRect(128, 207, 26, 4);

  // Keyboard
  ctx.fillStyle = p.chairFill;
  rr(ctx, 160, 170, 56, 18, 2); ctx.fill();
  ctx.strokeStyle = p.chairStroke;
  ctx.lineWidth = 0.5;
  for (let ki = 0; ki < 5; ki++) {
    for (let kj = 0; kj < 9; kj++) {
      rr(ctx, 162 + kj * 6, 172 + ki * 3, 5, 2, 0.5); ctx.stroke();
    }
  }
  // Mouse
  ctx.fillStyle = p.chairFill;
  rr(ctx, 220, 172, 14, 20, 5); ctx.fill();
  ctx.strokeStyle = p.chairStroke;
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(220, 182); ctx.lineTo(234, 182); ctx.stroke();

  // ── Executive chair ───────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 12);
  // Back
  ctx.fillStyle = p.chairFill;
  rr(ctx, 70, 218, 44, 36, 6); ctx.fill();
  // Seat
  rr(ctx, 66, 240, 52, 22, 5); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.chairStroke;
  ctx.lineWidth = 1.5;
  rr(ctx, 70, 218, 44, 36, 6); ctx.stroke();
  rr(ctx, 66, 240, 52, 22, 5); ctx.stroke();
  // Armrests
  ctx.fillStyle = p.chairFill;
  ctx.fillRect(64, 236, 6, 20);
  ctx.fillRect(116, 236, 6, 20);
  // Chair base (5 wheels star)
  ctx.strokeStyle = p.chairStroke; ctx.lineWidth = 2;
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(92, 265);
    ctx.lineTo(92 + Math.cos(ang) * 16, 265 + Math.sin(ang) * 10);
    ctx.stroke();
  }

  // ── Side table + lamp ─────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 6);
  ctx.fillStyle = p.deskMid;
  rr(ctx, 225, 235, 40, 35, 3); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1;
  rr(ctx, 225, 235, 40, 35, 3); ctx.stroke();
  // Lamp
  ctx.fillStyle = p.deskDark;
  ctx.fillRect(242, 218, 4, 17);
  ctx.fillStyle = p.mugFill;
  rr(ctx, 233, 208, 22, 14, 3); ctx.fill();
  // Lamp glow on table
  const lampG = ctx.createRadialGradient(244, 235, 0, 244, 235, 30);
  lampG.addColorStop(0, "rgba(255,240,180,0.12)");
  lampG.addColorStop(1, "transparent");
  ctx.fillStyle = lampG;
  ctx.fillRect(214, 215, 60, 60);
  // Coffee mug on table
  ctx.fillStyle = p.mugFill;
  rr(ctx, 236, 248, 12, 16, 2); ctx.fill();
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(250, 256, 5, -0.5, 0.5); ctx.stroke();

  // ── Corner plant ──────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.plantPot;
  rr(ctx, 254, 240, 28, 28, 3); ctx.fill();
  noShadow(ctx);
  // Soil
  ctx.fillStyle = "rgba(30,20,10,0.6)";
  rr(ctx, 256, 240, 24, 8, 2); ctx.fill();
  // Leaves
  ctx.fillStyle = p.plantLeaf;
  ctx.beginPath(); ctx.ellipse(264, 225, 20, 10, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(272, 218, 16, 8, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(256, 222, 12, 7, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.plantLeaf2;
  ctx.beginPath(); ctx.ellipse(268, 230, 10, 5, -0.2, 0, Math.PI * 2); ctx.fill();

  // ── Window (top wall) ─────────────────────────────────────────────────────────
  ctx.fillStyle = p.glassBlue;
  rr(ctx, 86, 7, 130, 22, 3); ctx.fill();
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 86, 7, 130, 22, 3); ctx.stroke();
  // Window panes
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(151, 7); ctx.lineTo(151, 29); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(86, 18); ctx.lineTo(216, 18); ctx.stroke();
  // Blind lines
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 0.5;
  for (let bx = 90; bx < 214; bx += 8) {
    ctx.beginPath(); ctx.moveTo(bx, 7); ctx.lineTo(bx, 29); ctx.stroke();
  }

  // ══ WAR ROOM (440,240 → 760,550) ═════════════════════════════════════════════

  // Rug under table
  ctx.fillStyle = p.rugWarm;
  rr(ctx, 458, 264, 286, 268, 10); ctx.fill();

  // ── Conference table ─────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 16);
  ctx.fillStyle = p.tableWar;
  rr(ctx, 488, 302, 228, 160, 10); ctx.fill();
  noShadow(ctx);
  // Table surface reflection
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  rr(ctx, 492, 306, 110, 60, 6); ctx.fill();
  // Table edge trim
  ctx.strokeStyle = p.tableWarEdge;
  ctx.lineWidth = 2;
  rr(ctx, 488, 302, 228, 160, 10); ctx.stroke();
  // Center line
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(488, 382); ctx.lineTo(716, 382); ctx.stroke();
  // Items on table: laptops, papers, glasses
  for (let i = 0; i < 3; i++) {
    const tx = 508 + i * 70;
    // Laptop
    ctx.fillStyle = p.screenFill;
    rr(ctx, tx, 320, 40, 26, 2); ctx.fill();
    ctx.fillStyle = p.screenGlow;
    rr(ctx, tx + 2, 322, 36, 22, 1); ctx.fill();
    // Paper
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    rr(ctx, tx + 5, 355, 30, 22, 1); ctx.fill();
  }
  // Water glasses
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = p.glassBlue;
    rr(ctx, 500 + i * 54, 392, 12, 18, 2); ctx.fill();
    ctx.strokeStyle = "rgba(100,200,255,0.3)"; ctx.lineWidth = 0.5;
    rr(ctx, 500 + i * 54, 392, 12, 18, 2); ctx.stroke();
  }

  // ── Chairs around table ───────────────────────────────────────────────────────
  const chairWRPositions = [
    // top row
    { x: 504, y: 270, rot: 0 }, { x: 564, y: 270, rot: 0 }, { x: 624, y: 270, rot: 0 },
    // bottom row
    { x: 504, y: 468, rot: Math.PI }, { x: 564, y: 468, rot: Math.PI }, { x: 624, y: 468, rot: Math.PI },
    // left
    { x: 455, y: 330, rot: Math.PI / 2 }, { x: 455, y: 395, rot: Math.PI / 2 },
    // right
    { x: 718, y: 330, rot: -Math.PI / 2 }, { x: 718, y: 395, rot: -Math.PI / 2 },
  ];
  for (const c of chairWRPositions) {
    ctx.save();
    ctx.translate(c.x + 22, c.y + 12);
    ctx.rotate(c.rot);
    shadow(ctx, p.shadow, 5);
    ctx.fillStyle = p.chairWarFill;
    rr(ctx, -22, -12, 44, 24, 5); ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = p.chairWarStroke; ctx.lineWidth = 1.5;
    rr(ctx, -22, -12, 44, 24, 5); ctx.stroke();
    // Cushion
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    rr(ctx, -18, -8, 36, 16, 3); ctx.fill();
    ctx.restore();
  }

  // ── Whiteboard left wall ───────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 6);
  ctx.fillStyle = p.whiteboard;
  rr(ctx, 450, 262, 22, 110, 2); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 450, 262, 22, 110, 2); ctx.stroke();
  // Marker drawings
  ctx.strokeStyle = p.whiteboardLine; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(453, 278); ctx.lineTo(468, 278); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(453, 288); ctx.lineTo(465, 288); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(453, 298); ctx.lineTo(469, 298); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(453, 308); ctx.lineTo(461, 308); ctx.stroke();
  // Box drawing (diagram)
  ctx.strokeStyle = "rgba(255,150,100,0.5)"; ctx.lineWidth = 1;
  rr(ctx, 453, 320, 14, 10, 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(460, 330); ctx.lineTo(460, 340); ctx.stroke();
  rr(ctx, 453, 340, 14, 10, 1); ctx.stroke();
  // Marker tray
  ctx.fillStyle = p.deskMid;
  ctx.fillRect(450, 372, 22, 5);

  // ── Large TV / screen right wall ──────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.tvFill;
  rr(ctx, 755, 262, 20, 110, 3); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.tvScreen;
  rr(ctx, 757, 264, 16, 106, 2); ctx.fill();
  // Screen content (presentation)
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  rr(ctx, 758, 272, 14, 25, 1); ctx.fill();
  rr(ctx, 758, 302, 14, 8, 1); ctx.fill();
  rr(ctx, 758, 314, 14, 8, 1); ctx.fill();
  ctx.strokeStyle = "rgba(60,160,255,0.4)"; ctx.lineWidth = 0.5;
  rr(ctx, 755, 262, 20, 110, 3); ctx.stroke();

  // ── Coffee station (back-right corner) ────────────────────────────────────────
  shadow(ctx, p.shadow, 6);
  ctx.fillStyle = p.counterFill;
  rr(ctx, 680, 246, 72, 28, 3); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.counterTop;
  rr(ctx, 680, 246, 72, 8, 3); ctx.fill();
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 680, 246, 72, 28, 3); ctx.stroke();
  // Coffee machine
  ctx.fillStyle = p.deskDark;
  rr(ctx, 700, 248, 22, 24, 3); ctx.fill();
  ctx.fillStyle = p.screenGlow;
  rr(ctx, 703, 250, 16, 8, 2); ctx.fill();
  // Mugs
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ["#e05555","#6c63ff","#3dffa0"][i] + "bb";
    rr(ctx, 682 + i * 8, 252, 6, 10, 1); ctx.fill();
  }

  // ══ LOUNGE (900,560 → 1200,800) ══════════════════════════════════════════════

  // Rug
  ctx.fillStyle = p.rugCool;
  rr(ctx, 910, 572, 284, 224, 12); ctx.fill();

  // ── L-shaped sofa ─────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 14);
  ctx.fillStyle = p.sofaFill;
  rr(ctx, 910, 576, 175, 56, 8); ctx.fill();   // main sofa
  rr(ctx, 1046, 576, 56, 125, 8); ctx.fill();  // side piece
  noShadow(ctx);
  ctx.strokeStyle = p.sofaStroke; ctx.lineWidth = 2;
  rr(ctx, 910, 576, 175, 56, 8); ctx.stroke();
  rr(ctx, 1046, 576, 56, 125, 8); ctx.stroke();
  // Back cushions
  ctx.fillStyle = p.cushionFill;
  for (let i = 0; i < 3; i++) { rr(ctx, 916 + i * 56, 578, 50, 20, 5); ctx.fill(); }
  rr(ctx, 1050, 578, 46, 28, 5); ctx.fill();
  rr(ctx, 1050, 610, 46, 28, 5); ctx.fill();
  // Seat cushions
  ctx.fillStyle = p.sofaFill;
  for (let i = 0; i < 3; i++) { rr(ctx, 916 + i * 56, 600, 50, 28, 4); ctx.fill(); }
  rr(ctx, 1050, 640, 46, 50, 4); ctx.fill();
  // Throw pillow
  ctx.fillStyle = "rgba(255,160,80,0.5)";
  rr(ctx, 950, 600, 22, 22, 4); ctx.fill();
  ctx.save(); ctx.translate(961, 611); ctx.rotate(0.4);
  ctx.fillStyle = "rgba(255,200,80,0.4)";
  rr(ctx, -10, -10, 20, 20, 3); ctx.fill();
  ctx.restore();

  // ── Armchair ────────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.sofaFill;
  rr(ctx, 910, 650, 60, 50, 8); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.sofaStroke; ctx.lineWidth = 1.5;
  rr(ctx, 910, 650, 60, 50, 8); ctx.stroke();
  ctx.fillStyle = p.cushionFill;
  rr(ctx, 914, 658, 52, 34, 5); ctx.fill();
  // Armrests
  ctx.fillStyle = p.sofaFill;
  ctx.fillRect(908, 650, 8, 40);
  ctx.fillRect(962, 650, 8, 40);

  // ── Coffee table ─────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 10);
  ctx.fillStyle = p.coffeeTable;
  rr(ctx, 920, 640, 116, 62, 6); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1.5;
  rr(ctx, 920, 640, 116, 62, 6); ctx.stroke();
  // Surface reflection
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  rr(ctx, 924, 643, 60, 20, 3); ctx.fill();
  // Items on table
  ctx.fillStyle = p.mugFill;
  rr(ctx, 938, 652, 14, 18, 2); ctx.fill();
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(953, 661, 5, -0.5, 0.5); ctx.stroke();
  // Laptop
  ctx.fillStyle = p.screenFill;
  rr(ctx, 960, 650, 34, 22, 2); ctx.fill();
  ctx.fillStyle = p.screenGlow;
  rr(ctx, 962, 652, 30, 18, 1); ctx.fill();
  // Magazine/book
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  rr(ctx, 930, 672, 40, 24, 2); ctx.fill();

  // ── TV wall ──────────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 12);
  ctx.fillStyle = p.tvFill;
  rr(ctx, 907, 566, 100, 58, 5); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.tvScreen;
  rr(ctx, 910, 569, 94, 52, 4); ctx.fill();
  // TV content
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  rr(ctx, 913, 573, 40, 44, 2); ctx.fill();
  rr(ctx, 957, 573, 44, 20, 2); ctx.fill();
  rr(ctx, 957, 597, 44, 20, 2); ctx.fill();
  // TV glow
  const tvG = ctx.createRadialGradient(957, 595, 0, 957, 595, 60);
  tvG.addColorStop(0, "rgba(40,80,220,0.08)");
  tvG.addColorStop(1, "transparent");
  ctx.fillStyle = tvG; ctx.fillRect(897, 555, 120, 80);
  // TV stand
  ctx.fillStyle = p.deskDark;
  ctx.fillRect(948, 624, 16, 8);
  ctx.fillRect(940, 631, 32, 4);
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 907, 566, 100, 58, 5); ctx.stroke();

  // ── Large plants ──────────────────────────────────────────────────────────────
  for (const [px, py, s] of [[1158, 735, 1.0], [1100, 570, 0.75]] as [number, number, number][]) {
    shadow(ctx, p.shadow, 8 * s);
    ctx.fillStyle = p.plantPot;
    rr(ctx, px - 14 * s, py - 5 * s, 28 * s, 32 * s, 3); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = "rgba(20,12,5,0.6)";
    rr(ctx, px - 12 * s, py - 5 * s, 24 * s, 10 * s, 2); ctx.fill();
    ctx.fillStyle = p.plantLeaf;
    ctx.beginPath(); ctx.ellipse(px, py - 18 * s, 22 * s, 12 * s, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + 10 * s, py - 25 * s, 16 * s, 9 * s, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px - 10 * s, py - 22 * s, 14 * s, 8 * s, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.plantLeaf2;
    ctx.beginPath(); ctx.ellipse(px + 4 * s, py - 14 * s, 12 * s, 6 * s, 0.2, 0, Math.PI * 2); ctx.fill();
    // Stems
    ctx.strokeStyle = p.plantLeaf; ctx.lineWidth = s;
    ctx.beginPath(); ctx.moveTo(px, py - 5 * s); ctx.quadraticCurveTo(px - 5 * s, py - 16 * s, px - 10 * s, py - 22 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py - 5 * s); ctx.quadraticCurveTo(px + 6 * s, py - 18 * s, px + 10 * s, py - 25 * s); ctx.stroke();
  }

  // ── Mini kitchen counter ──────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 6);
  ctx.fillStyle = p.counterFill;
  rr(ctx, 1108, 568, 90, 35, 3); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.counterTop;
  rr(ctx, 1108, 568, 90, 9, 3); ctx.fill();
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 1108, 568, 90, 35, 3); ctx.stroke();
  // Sink
  ctx.fillStyle = p.sinkFill;
  rr(ctx, 1122, 571, 28, 22, 2); ctx.fill();
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 0.8;
  rr(ctx, 1122, 571, 28, 22, 2); ctx.stroke();
  ctx.fillStyle = p.glassBlue;
  rr(ctx, 1124, 573, 24, 18, 1); ctx.fill();
  // Faucet
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(1136, 571); ctx.lineTo(1136, 564); ctx.lineTo(1144, 564); ctx.stroke();
  // Coffee machine
  ctx.fillStyle = p.deskDark;
  rr(ctx, 1158, 569, 28, 30, 3); ctx.fill();
  ctx.fillStyle = p.screenGlow;
  rr(ctx, 1160, 572, 24, 10, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,120,80,0.4)";
  ctx.beginPath(); ctx.arc(1184, 577, 3, 0, Math.PI * 2); ctx.fill();

  // ══ OPEN FLOOR — scattered workstations ══════════════════════════════════════

  const desks = [
    { x: 328, y: 36, facing: "down" },
    { x: 328, y: 140, facing: "down" },
    { x: 808, y: 36, facing: "down" },
    { x: 808, y: 140, facing: "down" },
    { x: 95, y: 370, facing: "right" },
    { x: 195, y: 490, facing: "right" },
    { x: 590, y: 600, facing: "up" },
    { x: 680, y: 700, facing: "up" },
  ];

  for (const d of desks) {
    shadow(ctx, p.shadow, 6);
    ctx.fillStyle = p.deskMid;
    rr(ctx, d.x, d.y, 84, 48, 3); ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = p.deskLight;
    rr(ctx, d.x, d.y, 84, 8, 3); ctx.fill();
    ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1;
    rr(ctx, d.x, d.y, 84, 48, 3); ctx.stroke();
    // Monitor
    ctx.fillStyle = p.screenFill;
    rr(ctx, d.x + 22, d.y + 6, 38, 26, 2); ctx.fill();
    ctx.fillStyle = p.screenGlow;
    rr(ctx, d.x + 24, d.y + 8, 34, 22, 1); ctx.fill();
    // Keyboard
    ctx.fillStyle = p.chairFill;
    rr(ctx, d.x + 20, d.y + 34, 34, 10, 1); ctx.fill();
    // Chair (simple arc)
    const facing = d.facing;
    const cy2 = facing === "down" ? d.y + 55 : facing === "up" ? d.y - 14 : d.y + 20;
    const cx2 = facing === "right" ? d.x + 95 : d.x + 42;
    ctx.beginPath(); ctx.arc(cx2, cy2, 14, 0, Math.PI * 2);
    ctx.fillStyle = p.chairFill; ctx.fill();
    ctx.strokeStyle = p.chairStroke; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // ── Water cooler ─────────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.counterFill;
  rr(ctx, 410, 38, 24, 48, 4); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.glassBlue;
  rr(ctx, 412, 40, 20, 24, 4); ctx.fill();
  // Water level
  ctx.fillStyle = "rgba(80,160,240,0.4)";
  rr(ctx, 413, 54, 18, 10, 2); ctx.fill();
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 410, 38, 24, 48, 4); ctx.stroke();
  // Cup dispenser
  ctx.fillStyle = p.deskMid;
  rr(ctx, 412, 68, 20, 12, 2); ctx.fill();
  // Tap buttons
  ctx.fillStyle = "rgba(0,180,255,0.6)";
  ctx.beginPath(); ctx.arc(417, 78, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,80,80,0.6)";
  ctx.beginPath(); ctx.arc(425, 78, 3, 0, Math.PI * 2); ctx.fill();

  // ── Structural columns ────────────────────────────────────────────────────────
  const cols = [{ x: 420, y: 220 }, { x: 780, y: 220 }, { x: 420, y: 520 }, { x: 780, y: 520 }];
  for (const c of cols) {
    shadow(ctx, p.shadow, 8);
    ctx.fillStyle = p.wallFill;
    rr(ctx, c.x - 12, c.y - 12, 24, 24, 2); ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1.5;
    rr(ctx, c.x - 12, c.y - 12, 24, 24, 2); ctx.stroke();
    // Column highlight
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(c.x - 10, c.y - 10, 5, 20);
  }
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  user: User,
  isMe: boolean,
  p: P,
  isSpeaking: boolean,
  now: number
) {
  const statusColor = STATUS_COLORS[user.status];

  // Speaking pulse ring
  if (isSpeaking) {
    const pulse = 0.55 + 0.45 * Math.sin(now / 180);
    const ringR = AVATAR_R + 6 + 4 * Math.sin(now / 220);
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(61, 255, 160, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, ringR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(61, 255, 160, ${pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  shadow(ctx, p.shadow, isMe ? 14 : 8);

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(x, y, AVATAR_R + 3, 0, Math.PI * 2);
  ctx.strokeStyle = isMe ? "rgba(255,255,255,0.5)" : `${statusColor}66`;
  ctx.lineWidth = isMe ? 2.5 : 1.5;
  ctx.stroke();

  noShadow(ctx);

  // Avatar circle
  ctx.beginPath();
  ctx.arc(x, y, AVATAR_R, 0, Math.PI * 2);
  ctx.fillStyle = isMe ? p.avatarMeFill : p.avatarFill;
  ctx.fill();

  // Initials
  const ini = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(AVATAR_R * 0.72)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ini, x, y + 1);

  // Name label
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.fillStyle = isMe ? p.label : p.labelMuted;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(user.name, x, y + AVATAR_R + 6);

  // Mute badge
  if (user.isMuted) {
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("🔇", x + AVATAR_R - 3, y - AVATAR_R + 2);
  }

  // Status dot
  ctx.beginPath();
  ctx.arc(x + AVATAR_R - 5, y + AVATAR_R - 5, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.fill();
  ctx.strokeStyle = p.bg;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ─── Zone indicator ───────────────────────────────────────────────────────────
function drawZoneIndicator(ctx: CanvasRenderingContext2D, zoneName: string, p: P) {
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  const text = ` ${zoneName} `;
  const tw = ctx.measureText(text).width;
  const px = CANVAS_W - tw - 24;
  const py = 14;
  const h = 26;

  ctx.fillStyle = p.indicator;
  ctx.beginPath();
  ctx.roundRect(px - 6, py - 2, tw + 12, h, 8);
  ctx.fill();

  ctx.fillStyle = p.indicatorTxt;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, px, py + h / 2 - 1);
}

// ─── Knock button ──────────────────────────────────────────────────────────────
const KNOCK_BTN = { x: 308, y: 118, w: 72, h: 28 } as const;
const DOOR_CENTER_PX = { x: PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w, y: DOOR.y + DOOR.h / 2 };
const KNOCK_RANGE_PX = 100;

function drawKnockButton(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = KNOCK_BTN;
  ctx.fillStyle = "rgba(108,99,255,0.9)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🚪 Knock", x + w / 2, y + h / 2);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  room: Room;
  myUserId: string | null;
  myPosition: Position2D | null;
  onMove: (position: Position2D) => void;
  onStatusChange: (status: UserStatus) => void;
  onZoneChange: (zone: string) => void;
  privateOfficeDoorClosed: boolean;
  onDoorToggle: () => void;
  onKnock: (targetUserIds: string[]) => void;
  isDark: boolean;
  speakingNames: Set<string>;
}

export function OfficeCanvas({
  room, myUserId, myPosition,
  onMove, onZoneChange,
  privateOfficeDoorClosed, onDoorToggle, onKnock,
  isDark, speakingNames,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const syncedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastEmitRef = useRef<number>(0);
  const lastZoneRef = useRef<string>("");
  const showKnockRef = useRef(false);

  const roomRef = useRef(room);
  const interpRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  useEffect(() => {
    roomRef.current = room;
    for (const user of room.users) {
      if (!interpRef.current.has(user.id)) {
        interpRef.current.set(user.id, pctToPx(user.position));
      }
    }
    for (const id of interpRef.current.keys()) {
      if (!room.users.find((u) => u.id === id)) interpRef.current.delete(id);
    }
  }, [room]);

  const myUserIdRef = useRef(myUserId);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);

  const doorClosedRef = useRef(privateOfficeDoorClosed);
  useEffect(() => { doorClosedRef.current = privateOfficeDoorClosed; }, [privateOfficeDoorClosed]);

  const isDarkRef = useRef(isDark);
  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);

  const paletteRef = useRef(palette(isDark));
  useEffect(() => { paletteRef.current = palette(isDark); }, [isDark]);

  const speakingNamesRef = useRef(speakingNames);
  useEffect(() => { speakingNamesRef.current = speakingNames; }, [speakingNames]);

  useEffect(() => {
    if (myPosition && !syncedRef.current) {
      posRef.current = pctToPx(myPosition);
      syncedRef.current = true;
    }
  }, [myPosition]);

  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  const onZoneChangeRef = useRef(onZoneChange);
  useEffect(() => { onZoneChangeRef.current = onZoneChange; }, [onZoneChange]);
  const onDoorToggleRef = useRef(onDoorToggle);
  useEffect(() => { onDoorToggleRef.current = onDoorToggle; }, [onDoorToggle]);
  const onKnockRef = useRef(onKnock);
  useEffect(() => { onKnockRef.current = onKnock; }, [onKnock]);

  const tick = useCallback((time: number) => {
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = time;

    const keys = keysRef.current;
    let { x, y } = posRef.current;
    let moved = false;

    if (keys.has("w") || keys.has("arrowup"))    { y -= SPEED * dt; moved = true; }
    if (keys.has("s") || keys.has("arrowdown"))  { y += SPEED * dt; moved = true; }
    if (keys.has("a") || keys.has("arrowleft"))  { x -= SPEED * dt; moved = true; }
    if (keys.has("d") || keys.has("arrowright")) { x += SPEED * dt; moved = true; }

    x = Math.max(AVATAR_R, Math.min(CANVAS_W - AVATAR_R, x));
    y = Math.max(AVATAR_R, Math.min(CANVAS_H - AVATAR_R, y));
    posRef.current = { x, y };

    if (moved && time - lastEmitRef.current > 60) {
      onMoveRef.current(pxToPct(x, y));
      lastEmitRef.current = time;
    }

    const zone = detectZone(x, y);
    if (zone !== lastZoneRef.current) {
      lastZoneRef.current = zone;
      onZoneChangeRef.current(zone);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw > 0 && ch > 0 && (canvas.width !== cw || canvas.height !== ch)) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const sx = canvas.width / CANVAS_W;
    const sy = canvas.height / CANVAS_H;
    ctx.save();
    ctx.scale(sx, sy);

    const p = paletteRef.current;
    drawBackground(ctx, p);
    drawZones(ctx, doorClosedRef.current, p);
    drawLights(ctx, p);
    drawFurniture(ctx, p);

    const alpha = 1 - Math.exp(-dt * LERP_SPEED);
    const myId = myUserIdRef.current;
    const speaking = speakingNamesRef.current;

    for (const user of roomRef.current.users) {
      if (user.id === myId) continue;
      const target = pctToPx(user.position);
      const cur = interpRef.current.get(user.id) ?? target;
      const ix = cur.x + (target.x - cur.x) * alpha;
      const iy = cur.y + (target.y - cur.y) * alpha;
      interpRef.current.set(user.id, { x: ix, y: iy });
      drawAvatar(ctx, ix, iy, user, false, p, speaking.has(user.name), time);
    }

    const meUser = roomRef.current.users.find((u) => u.id === myId);
    if (meUser) drawAvatar(ctx, x, y, meUser, true, p, speaking.has(meUser.name), time);

    drawZoneIndicator(ctx, zone, p);

    const distToDoor = Math.sqrt(
      (x - DOOR_CENTER_PX.x) ** 2 + (y - DOOR_CENTER_PX.y) ** 2
    );
    const showKnock =
      doorClosedRef.current &&
      zone !== "Private Office" &&
      distToDoor <= KNOCK_RANGE_PX;
    showKnockRef.current = showKnock;
    if (showKnock) drawKnockButton(ctx);

    ctx.restore();
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    }
    function onKeyUp(e: KeyboardEvent) { keysRef.current.delete(e.key.toLowerCase()); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    if (showKnockRef.current) {
      const { x, y, w, h } = KNOCK_BTN;
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
        const occupants = roomRef.current.users
          .filter((u) => {
            if (u.id === myUserIdRef.current) return false;
            const px = pctToPx(u.position);
            return detectZone(px.x, px.y) === "Private Office";
          })
          .map((u) => u.id);
        onKnockRef.current(occupants);
        return;
      }
    }

    if (cx >= DOOR.x && cx <= DOOR.x + DOOR.w && cy >= DOOR.y && cy <= DOOR.y + DOOR.h) {
      onDoorToggleRef.current();
    }
  }

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="office-canvas"
        onClick={handleCanvasClick}
        style={{ cursor: "default" }}
      />
      <p className="canvas-hint">Move with W A S D or arrow keys · Click the door to open / close</p>
    </div>
  );
}
