import { useEffect, useRef, useCallback } from "react";
import { Room, Position2D, UserStatus, User, OfficeAssignment } from "@lifescale/shared";
import {
  CANVAS_W, CANVAS_H, ZONES, DOOR, DOOR_2,
  PRIVATE_OFFICE_ZONE, PRIVATE_OFFICE_2_ZONE, detectZone, pctToPx, pxToPct,
} from "../zones";

const AVATAR_R = 18;
const SPEED = 260;
const LERP_SPEED = 12;

const STATUS_COLORS: Record<UserStatus, string> = {
  available:   "#30F090",
  "deep-work": "#F84040",
  "on-a-call": "#F8C820",
};

// ─── Theme palettes ────────────────────────────────────────────────────────────
// SNES/GBA-era flat colour palette. No gradients on structural elements.
// Dark = dungeon / night office  |  Light = daytime office
function palette(isDark: boolean) {
  return isDark ? {
    // ── Gather.town dark palette ─────────────────────────────────────────────
    bg:            "#1a1a1a",   // charcoal canvas
    tile1:         "#1e1e1e",
    tile2:         "#1a1a1a",
    grout:         "#141414",   // subtle grid lines
    pathFill:      "#1e1e1e",
    // ── Room floors ──────────────────────────────────────────────────────────
    wood1:         "#5C3D1E",   // dark warm wood floor
    wood2:         "#6B4A28",
    woodGrain:     "#3A2510",
    warmCarpet:    "#5C3D1E",
    warmCarpetAlt: "#4A3018",
    warmCarpetLine:"#8B5E3C",
    coolCarpet:    "#1A3D2E",   // teal for lounge
    coolCarpetAlt: "#142E22",
    coolCarpetLine:"#2E8B6A",
    // ── Walls — thick wooden/brown borders ───────────────────────────────────
    wallFill:      "#8B5E3C",   // warm brown wall panels
    wallHighlight: "#9A6B47",
    wallShadow:    "#5C3D1E",
    wallBorder:    "#8B5E3C",
    // ── Ceiling light markers ─────────────────────────────────────────────────
    lightGlow:     "#F8E890",
    lightFixture:  "#F0D060",
    lightRing:     "#C8A828",
    // ── Zone labels ──────────────────────────────────────────────────────────
    zoneLabel:     "#E8D890",
    // ── Avatar / UI ──────────────────────────────────────────────────────────
    avatarFill:    "#5C3D1E",
    avatarMeFill:  "#4488FF",   // bright blue for self
    label:         "#F0E8D0",
    labelMuted:    "#A09070",
    indicator:     "#1a1a1a",
    indicatorTxt:  "#E8D890",
    // ── Furniture (flat pixel blocks) ────────────────────────────────────────
    deskDark:      "#3A2510",   // dark brown desks
    deskMid:       "#4A3018",
    deskLight:     "#5A3820",
    deskEdge:      "#6B4520",
    chairFill:     "#8B2222",   // muted red chairs
    chairStroke:   "#6B1212",
    screenFill:    "#4488FF",   // bright blue screens
    screenGlow:    "#66AAFF",
    screenGlowOut: "#1A3A7A",
    tableWar:      "#3A2510",
    tableWarEdge:  "#6B4520",
    chairWarFill:  "#8B2222",
    chairWarStroke:"#AA3333",
    sofaFill:      "#1A5C3A",   // dark teal sofas
    sofaStroke:    "#2E8B6A",
    cushionFill:   "#2E8B6A",
    coffeeTable:   "#3A2510",
    tvFill:        "#0a0a0a",
    tvScreen:      "#4488FF",
    plantPot:      "#6B4520",
    plantLeaf:     "#2E8B6A",   // teal plants
    plantLeaf2:    "#3AAA80",
    bookShelf:     "#2A1A0A",
    bookEdge:      "#4A2A10",
    rugWarm:       "rgba(139,94,60,0.15)",
    rugCool:       "rgba(46,139,106,0.15)",
    shadow:        "rgba(0,0,0,0.8)",
    doorFill:      "#8B5E3C",
    doorText:      "#E8D890",
    counterFill:   "#3A2510",
    counterTop:    "#5A3820",
    sinkFill:      "#1A3848",
    glassBlue:     "#4488FF",
    mugFill:       "#C8A020",
    whiteboard:    "#F0ECD8",
    whiteboardLine:"#2840D8",
  } : {
    // ── Base floor (warm sandy — Pokémon town tiles) ──────────────────────────
    bg:            "#A89860",
    tile1:         "#B8A870",
    tile2:         "#C0B078",
    grout:         "#806840",
    pathFill:      "#D0C080",
    // ── Room floors ──────────────────────────────────────────────────────────
    wood1:         "#C87830",
    wood2:         "#E09040",
    woodGrain:     "#885018",
    warmCarpet:    "#B03828",
    warmCarpetAlt: "#902818",
    warmCarpetLine:"#D85840",
    coolCarpet:    "#207868",
    coolCarpetAlt: "#186058",
    coolCarpetLine:"#30B090",
    // ── Walls (SNES flat — no gradients) ─────────────────────────────────────
    wallFill:      "#785030",
    wallHighlight: "#A87040",  // top/left bright face
    wallShadow:    "#402010",  // bottom/right shadow face
    wallBorder:    "#E0A040",
    // ── Ceiling light markers ─────────────────────────────────────────────────
    lightGlow:     "#F8F0A0",
    lightFixture:  "#F0D840",
    lightRing:     "#C8A020",
    // ── Zone labels ──────────────────────────────────────────────────────────
    zoneLabel:     "#402010",
    // ── Avatar / UI ──────────────────────────────────────────────────────────
    avatarFill:    "#907050",
    avatarMeFill:  "#4840C8",
    label:         "#201008",
    labelMuted:    "#605040",
    indicator:     "#E8D8B0",
    indicatorTxt:  "#201008",
    // ── Furniture ────────────────────────────────────────────────────────────
    deskDark:      "#805020",
    deskMid:       "#A06828",
    deskLight:     "#C88030",
    deskEdge:      "#E0A038",
    chairFill:     "#382010",
    chairStroke:   "#806040",
    screenFill:    "#0C1028",
    screenGlow:    "#2858D8",
    screenGlowOut: "#1038A0",
    tableWar:      "#684020",
    tableWarEdge:  "#B07830",
    chairWarFill:  "#901820",
    chairWarStroke:"#E04838",
    sofaFill:      "#186858",
    sofaStroke:    "#28A880",
    cushionFill:   "#1E8870",
    coffeeTable:   "#806030",
    tvFill:        "#0C0C18",
    tvScreen:      "#1840C8",
    plantPot:      "#906028",
    plantLeaf:     "#20C038",
    plantLeaf2:    "#30E050",
    bookShelf:     "#603820",
    bookEdge:      "#905028",
    rugWarm:       "rgba(215,155,65,0.1)",
    rugCool:       "rgba(38,195,148,0.1)",
    shadow:        "rgba(0,0,0,0.3)",
    doorFill:      "#C08838",
    doorText:      "#402010",
    counterFill:   "#B08840",
    counterTop:    "#D0A850",
    sinkFill:      "#9AACC8",
    glassBlue:     "#4898D8",
    mugFill:       "#E8C030",
    whiteboard:    "#F8F8F0",
    whiteboardLine:"#2840D8",
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

// ─── 3-D decorative rug ───────────────────────────────────────────────────────
function drawRug3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, style: number) {
  // face / side / accent per office style
  const COLORS: [string, string, string][] = [
    ["#7A1A2E", "#3D0D17", "#C43050"],  // 0 default — burgundy
    ["#1A3568", "#0E1E3D", "#2860B8"],  // 1 gold    — navy
    ["#0A485A", "#06262E", "#1880A0"],  // 2 cyan    — dark teal
    ["#1A5828", "#0E3018", "#2A9844"],  // 3 mint    — forest
    ["#7A3A10", "#3D1C08", "#C06020"],  // 4 golden  — rust
  ];
  const [face, side, accent] = COLORS[Math.max(0, Math.min(4, style))];
  const x = cx - w / 2;
  const y = cy - h / 2;
  const depth = 6;

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  rr(ctx, x + 4, y + 6, w + depth, h + depth, 6); ctx.fill();

  // Bottom face (3-D thickness visible from above)
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x + 5,           y + h);
  ctx.lineTo(x + w - 5,       y + h);
  ctx.lineTo(x + w - 5 + depth, y + h + depth);
  ctx.lineTo(x + 5 + depth,   y + h + depth);
  ctx.closePath();
  ctx.fill();

  // Right face
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x + w,           y + 5);
  ctx.lineTo(x + w,           y + h - 5);
  ctx.lineTo(x + w + depth,   y + h - 5 + depth);
  ctx.lineTo(x + w + depth,   y + 5 + depth);
  ctx.closePath();
  ctx.fill();

  // Main top surface
  ctx.fillStyle = face;
  rr(ctx, x, y, w, h, 6); ctx.fill();

  // Outer decorative border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2.5;
  rr(ctx, x + 7, y + 7, w - 14, h - 14, 3); ctx.stroke();

  // Inner border
  ctx.lineWidth = 1;
  rr(ctx, x + 12, y + 12, w - 24, h - 24, 2); ctx.stroke();

  // Centre diamond medallion
  ctx.lineWidth = 1.5;
  const mw = w * 0.20, mh = h * 0.30;
  ctx.beginPath();
  ctx.moveTo(cx,       cy - mh);
  ctx.lineTo(cx + mw,  cy);
  ctx.lineTo(cx,       cy + mh);
  ctx.lineTo(cx - mw,  cy);
  ctx.closePath();
  ctx.stroke();
  // Tiny centre dot
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();

  // Fringe — top edge
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  for (let fx = x + 8; fx < x + w - 8; fx += 5) {
    ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx - 1, y - 5); ctx.stroke();
  }
  // Fringe — bottom edge (on top surface before depth face)
  for (let fx = x + 8; fx < x + w - 8; fx += 5) {
    ctx.beginPath(); ctx.moveTo(fx, y + h); ctx.lineTo(fx + 1, y + h + 5); ctx.stroke();
  }

  // Subtle sheen — top-left highlight
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  rr(ctx, x + 3, y + 3, w * 0.5, h * 0.45, 5); ctx.fill();
}

// ─── Background — dark charcoal grid (Gather.town style) ──────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, p: P) {
  // Solid charcoal fill
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Faint grid lines
  ctx.strokeStyle = p.grout;
  ctx.lineWidth = 1;
  const G = 32;
  for (let tx = 0; tx <= CANVAS_W; tx += G) {
    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, CANVAS_H); ctx.stroke();
  }
  for (let ty = 0; ty <= CANVAS_H; ty += G) {
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(CANVAS_W, ty); ctx.stroke();
  }
}

// ─── Room floors — flat SNES-style tiles ──────────────────────────────────────
function drawWoodFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: P) {
  // Base fill
  ctx.fillStyle = p.wood1;
  ctx.fillRect(x, y, w, h);
  // 16 px plank stripes — alternating light/dark, hard edges (no gradients)
  const PH = 16;
  for (let py = y; py < y + h; py += PH) {
    const even = Math.floor((py - y) / PH) % 2 === 0;
    ctx.fillStyle = even ? p.wood1 : p.wood2;
    ctx.fillRect(x, py, w, Math.min(PH, y + h - py));
    // Single-pixel dark divider line at the top of each plank
    ctx.fillStyle = p.woodGrain;
    ctx.fillRect(x, py, w, 1);
  }
  // Plank end joints — vertical lines every ~80px, offset per row
  ctx.fillStyle = p.woodGrain;
  for (let py = y; py < y + h; py += PH) {
    const offset = Math.floor((py - y) / PH) % 3 * 28;
    for (let px = x + offset; px < x + w; px += 80) {
      ctx.fillRect(px, py, 1, PH);
    }
  }
}

function drawCarpet(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c1: string, c2: string, _line: string) {
  // Solid base colour
  ctx.fillStyle = c1;
  ctx.fillRect(x, y, w, h);
  // 8 px checker pattern — classic SNES carpet texture
  const CS = 8;
  ctx.fillStyle = c2;
  for (let cx2 = x; cx2 < x + w; cx2 += CS) {
    for (let cy2 = y; cy2 < y + h; cy2 += CS) {
      const col = (cx2 - x) / CS | 0;
      const row = (cy2 - y) / CS | 0;
      if ((col + row) % 2 === 0) {
        ctx.fillRect(cx2, cy2, Math.min(CS, x + w - cx2), Math.min(CS, y + h - cy2));
      }
    }
  }
  // 1-px dark border around room carpet for definition
  ctx.fillStyle = c2;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);
}

// ─── Ceiling lights — pixel-art flat fixtures, no gradients ───────────────────
function drawLights(ctx: CanvasRenderingContext2D, p: P) {
  const lights = [
    { x: 155, y: 28  },   // Private Office
    { x: 1045, y: 28 },   // Private Office 2
    { x: 598, y: 280 },   // War Room
    { x: 1040, y: 590},   // Lounge
    { x: 380, y: 210 },   // Open floor 1
    { x: 820, y: 210 },   // Open floor 2
  ];
  for (const l of lights) {
    // Ceiling mount — 2-px square ring (pixel art fixture)
    ctx.fillStyle = p.wallShadow;
    ctx.fillRect(l.x - 7, l.y - 3, 14, 6);
    ctx.fillStyle = p.lightFixture;
    ctx.fillRect(l.x - 5, l.y - 2, 10, 4);
    ctx.fillStyle = p.lightGlow;
    ctx.fillRect(l.x - 3, l.y - 1, 6, 2);
  }
}

// ─── Per-style office floor ───────────────────────────────────────────────────
function drawOfficeFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: number, p: P) {
  const isDark = p.bg === "#18140C";
  switch (style) {
    case 1: { // Marble Suite — white/cream with grey veining + gold grout
      ctx.fillStyle = isDark ? "#16140e" : "#f5f2ea";
      ctx.fillRect(x, y, w, h);
      // Tile grid
      const T = 55;
      ctx.strokeStyle = isDark ? "rgba(200,170,80,0.18)" : "rgba(160,130,50,0.22)";
      ctx.lineWidth = 0.8;
      for (let tx = x; tx <= x + w; tx += T) { ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke(); }
      for (let ty = y; ty <= y + h; ty += T) { ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke(); }
      // Marble veins
      ctx.strokeStyle = isDark ? "rgba(200,185,140,0.1)" : "rgba(120,100,60,0.13)";
      ctx.lineWidth = 1;
      const veins: [number, number, number, number, number, number, number, number][] = [
        [x+20, y+30, x+60, y+80, x+90, y+60, x+140, y+110],
        [x+60, y+150, x+100, y+180, x+140, y+170, x+180, y+210],
        [x+160, y+20, x+180, y+60, x+200, y+50, x+240, y+90],
      ];
      for (const [x1,y1,cx1,cy1,cx2,cy2,x2,y2] of veins) {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(cx1,cy1,cx2,cy2,x2,y2); ctx.stroke();
      }
      break;
    }
    case 2: { // Cyber Dark — near-black with glowing cyan grid
      ctx.fillStyle = "#020810";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(0,180,255,0.22)";
      ctx.lineWidth = 0.5;
      const G = 28;
      for (let tx = x; tx <= x + w; tx += G) { ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke(); }
      for (let ty = y; ty <= y + h; ty += G) { ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke(); }
      // Corner accent glows
      for (const [cx2, cy2] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]] as [number,number][]) {
        const g = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 50);
        g.addColorStop(0, "rgba(0,180,255,0.18)"); g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(cx2 - 50, cy2 - 50, 100, 100);
      }
      break;
    }
    case 3: { // Nordic — pale birch planks
      ctx.fillStyle = isDark ? "#1a160e" : "#f0ece0";
      ctx.fillRect(x, y, w, h);
      const plankH = 18;
      for (let py = y; py < y + h; py += plankH) {
        ctx.fillStyle = Math.floor((py - y) / plankH) % 2 === 0
          ? (isDark ? "rgba(210,195,160,0.3)" : "rgba(220,210,185,0.5)")
          : (isDark ? "rgba(195,178,142,0.27)" : "rgba(205,194,168,0.45)");
        ctx.fillRect(x, py, w, plankH);
        ctx.strokeStyle = isDark ? "rgba(160,140,100,0.13)" : "rgba(110,90,55,0.1)";
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke();
        // Plank end marks (staggered)
        const gap = Math.floor((py - y) / plankH) % 2 === 0 ? w * 0.55 : w * 0.35;
        ctx.beginPath(); ctx.moveTo(x + gap, py); ctx.lineTo(x + gap, py + plankH); ctx.stroke();
      }
      break;
    }
    case 4: { // Royal Gold — deep burgundy carpet with gold trim
      const c1 = isDark ? "rgba(55,5,15,0.95)" : "rgba(100,18,32,0.65)";
      const c2 = isDark ? "rgba(45,3,12,0.95)" : "rgba(85,14,26,0.6)";
      const cl = isDark ? "rgba(160,60,40,0.04)" : "rgba(180,70,50,0.04)";
      drawCarpet(ctx, x, y, w, h, c1, c2, cl);
      // Gold border trim (double line)
      ctx.strokeStyle = isDark ? "rgba(210,170,40,0.55)" : "rgba(190,150,25,0.65)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? "rgba(210,170,40,0.3)" : "rgba(190,150,25,0.35)";
      ctx.strokeRect(x + 10, y + 10, w - 20, h - 20);
      break;
    }
    default: // Executive (0) — warm dark wood
      drawWoodFloor(ctx, x, y, w, h, p);
  }
}


// ─── Zones — walls & labels ───────────────────────────────────────────────────
function drawZones(
  ctx: CanvasRenderingContext2D,
  doorClosed: boolean,
  p: P,
  offices: [OfficeAssignment, OfficeAssignment]
) {
  const WT = 14; // thicker walls = more visible 3D depth

  for (const z of ZONES) {
    // Floor texture
    if (z.id === "private-office") {
      drawOfficeFloor(ctx, z.x, z.y, z.w, z.h, offices[0].style ?? 0, p);
    } else if (z.id === "private-office-2") {
      drawOfficeFloor(ctx, z.x, z.y, z.w, z.h, offices[1].style ?? 0, p);
    } else if (z.id === "war-room") {
      drawCarpet(ctx, z.x, z.y, z.w, z.h, p.warmCarpet, p.warmCarpetAlt, p.warmCarpetLine);
    } else if (z.id === "lounge") {
      drawCarpet(ctx, z.x, z.y, z.w, z.h, p.coolCarpet, p.coolCarpetAlt, p.coolCarpetLine);
    }

    // Room label — personalised for private offices
    let label = z.name.toUpperCase();
    if (z.id === "private-office" && offices[0].ownerName) {
      label = `${offices[0].ownerName.split(" ")[0].toUpperCase()}'S OFFICE`;
    }
    if (z.id === "private-office-2" && offices[1].ownerName) {
      label = `${offices[1].ownerName.split(" ")[0].toUpperCase()}'S OFFICE`;
    }
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = p.zoneLabel;
    ctx.fillText(label, z.x + z.w / 2, z.y + z.h - 14);

    // Locked state
    const isLocked =
      (z.id === "private-office" && offices[0].locked) ||
      (z.id === "private-office-2" && offices[1].locked);

    // ── Wall helpers — flat Gather.town-style thick wooden borders ───────────
    // Horizontal wall — flat solid brown block
    const wH = (wx: number, wy: number, ww: number, wh2: number, _roomBelow: boolean) => {
      ctx.fillStyle = p.wallFill;
      ctx.fillRect(wx, wy, ww, wh2);
      // Top highlight pixel line
      ctx.fillStyle = p.wallHighlight;
      ctx.fillRect(wx, wy, ww, 2);
      // Bottom shadow line
      ctx.fillStyle = p.wallShadow;
      ctx.fillRect(wx, wy + wh2 - 2, ww, 2);
    };

    // Vertical wall — flat solid brown block
    const wV = (wx: number, wy: number, ww: number, wh2: number, roomRight: boolean) => {
      ctx.fillStyle = p.wallFill;
      ctx.fillRect(wx, wy, ww, wh2);
      ctx.fillStyle = p.wallHighlight;
      ctx.fillRect(wx, wy, 2, wh2);
      if (roomRight) {
        ctx.fillStyle = p.wallShadow;
        ctx.fillRect(wx + ww - 2, wy, 2, wh2);
        ctx.fillStyle = "#000000";
        ctx.fillRect(wx + ww, wy, 1, wh2);
      }
    };

    // ── Pixel drop shadow (solid dark rect offset 6px) ───────────────────────
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(z.x + 6, z.y + 6, z.w + WT, z.h + WT);

    if (z.id === "private-office") {
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w;
      wH(x, y, w + WT, WT, true);
      wV(x, y, WT, h, true);
      wH(x, y + h, w + WT, WT, false);
      wV(wallX, y, WT, DOOR.y - y, true);
      wV(wallX, DOOR.y + DOOR.h, WT, y + h - (DOOR.y + DOOR.h), true);
      drawDoor(ctx, isLocked || doorClosed, p, false);
    } else if (z.id === "private-office-2") {
      const { x, y, w, h } = PRIVATE_OFFICE_2_ZONE;
      const wallX = x;
      wH(x, y, w, WT, true);
      wV(x, y, WT, h, true);
      wV(x + w, y, WT, h + WT, false);
      wH(x, y + h, w + WT, WT, false);
      wV(wallX, y, WT, DOOR_2.y - y, true);
      wV(wallX, DOOR_2.y + DOOR_2.h, WT, y + h - (DOOR_2.y + DOOR_2.h), true);
      drawDoor(ctx, isLocked || doorClosed, p, true);
    } else {
      wH(z.x, z.y, z.w, WT, true);
      wH(z.x, z.y + z.h, z.w, WT, false);
      wV(z.x, z.y, WT, z.h, true);
      wV(z.x + z.w, z.y, WT, z.h + WT, false);
    }

    // ── 1px black inner border for crispness ─────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(z.x + WT, z.y + WT, z.w - WT, 1);
    ctx.fillRect(z.x + WT, z.y + WT, 1, z.h - WT);
    ctx.fillRect(z.x + z.w + WT - 1, z.y + WT, 1, z.h - WT);
    ctx.fillRect(z.x + WT, z.y + z.h + WT - 1, z.w - WT, 1);
  }
}

// ─── Door — pixel art flat door ────────────────────────────────────────────────
function drawDoor(ctx: CanvasRenderingContext2D, closed: boolean, p: P, isOffice2: boolean) {
  const door = isOffice2 ? DOOR_2 : DOOR;
  const { y, h } = door;
  const wallX = isOffice2
    ? PRIVATE_OFFICE_2_ZONE.x
    : PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w;

  const DW = 10; // door panel width

  if (closed) {
    // Closed door panel — dark wood with frame
    const dx = isOffice2 ? wallX : wallX - DW;
    ctx.fillStyle = "#000000";
    ctx.fillRect(dx - 1, y - 1, DW + 2, h + 2);
    ctx.fillStyle = p.doorFill;
    ctx.fillRect(dx, y, DW, h);
    // Door highlight (top strip)
    ctx.fillStyle = p.wallHighlight;
    ctx.fillRect(dx, y, DW, 2);
    // Lock icon — bright yellow square
    ctx.fillStyle = "#F8C820";
    ctx.fillRect(dx + 2, y + h / 2 - 3, 6, 6);
    ctx.fillStyle = "#000000";
    ctx.fillRect(dx + 3, y + h / 2 - 2, 4, 4);
    ctx.fillStyle = "#F8C820";
    ctx.fillRect(dx + 4, y + h / 2 - 4, 2, 3);
  } else {
    // Open door — bright gap in wall + angled door panel
    const gx = isOffice2 ? wallX : wallX - DW;
    ctx.fillStyle = "#000000";
    ctx.fillRect(gx, y, DW, h);
    // Door ajar (4-px strip at angle)
    ctx.fillStyle = p.doorFill;
    ctx.fillRect(isOffice2 ? wallX + DW : wallX - DW - 4, y, 4, h);
  }

  // "Open/Close" hint text
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.fillStyle = p.doorText;
  ctx.textBaseline = "middle";
  if (isOffice2) {
    ctx.textAlign = "right";
    ctx.fillText(closed ? "OPEN" : "CLOSE", wallX - 2, y + h / 2);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(closed ? "OPEN" : "CLOSE", wallX + DW + 2, y + h / 2);
  }
}

// ─── Furniture — flat pixel blocks (Gather.town style) ─────────────────────────
function drawFurniture(ctx: CanvasRenderingContext2D, p: P, officeStyles: [number, number]) {

  // ── Flat-block helpers ────────────────────────────────────────────────────────
  const desk = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = p.deskDark; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = p.deskLight; ctx.fillRect(x, y, w, 3);
    ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  };
  const screen = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "#000"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = p.screenFill; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    for (let sy2 = y + 1; sy2 < y + h; sy2 += 3) ctx.fillRect(x, sy2, w, 1);
  };
  const chair = (cx: number, cy: number, w = 20, h = 16) => {
    ctx.fillStyle = p.chairFill;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = p.chairStroke; ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(cx - w / 2 + 2, cy - h / 2 + 2, w - 4, 4);
  };
  const bookShelf = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = p.bookShelf; ctx.fillRect(x, y, w, h);
    const bc = ["#e05555","#4488FF","#3dffa0","#ffbe32","#a855f7","#ff8c42","#06b6d4","#E8D890"];
    let bx = x + 2;
    let bi = 0;
    while (bx < x + w - 4) {
      const bw = 3 + bi % 3;
      ctx.fillStyle = bc[bi % bc.length];
      ctx.fillRect(bx, y + 2, bw, h - 4);
      bx += bw + 1; bi++;
    }
    ctx.fillStyle = p.bookEdge; ctx.fillRect(x, y, w, 2);
  };
  const plant = (cx: number, cy: number, r = 10) => {
    ctx.fillStyle = p.plantPot; ctx.fillRect(cx - 7, cy - 2, 14, 10);
    ctx.fillStyle = p.plantLeaf;
    ctx.beginPath(); ctx.arc(cx, cy - r, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.plantLeaf2;
    ctx.beginPath(); ctx.arc(cx + r * 0.4, cy - r * 1.4, r * 0.65, 0, Math.PI * 2); ctx.fill();
  };
  const win = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = p.glassBlue; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x + 2, y + 2, w / 2 - 3, h - 4);
    ctx.fillStyle = "#000"; ctx.fillRect(x + w / 2 - 1, y, 2, h);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  };

  // ══ PRIVATE OFFICE 1 (0,0 → 300,280) ══════════════════════════════════════════

  drawRug3D(ctx, 155, 195, 162, 100, officeStyles[0]);

  bookShelf(14, 18, 20, 240);        // left wall

  desk(50, 140, 200, 52);            // main desk
  desk(50, 192, 60, 60);             // return

  screen(95, 143, 44, 28);           // monitor

  ctx.fillStyle = "#2a2a2a"; ctx.fillRect(148, 162, 50, 13);   // keyboard

  chair(92, 252);

  ctx.fillStyle = p.deskMid; ctx.fillRect(228, 238, 38, 32);   // side table
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1; ctx.strokeRect(228, 238, 38, 32);
  ctx.fillStyle = p.deskDark; ctx.fillRect(245, 222, 4, 16);   // lamp pole
  ctx.fillStyle = p.mugFill;  ctx.fillRect(236, 214, 22, 10);  // lamp shade

  plant(264, 248, 14);               // corner plant

  win(86, 8, 130, 20);               // window

  // ══ WAR ROOM (440,240 → 760,550) ═════════════════════════════════════════════

  ctx.fillStyle = p.rugWarm; ctx.fillRect(454, 254, 292, 282);

  desk(484, 296, 236, 166);          // conference table

  for (const [cx2, cy2] of [
    [504,270],[564,270],[624,270],[684,270],
    [504,474],[564,474],[624,474],[684,474],
    [462,340],[462,400],
    [722,340],[722,400],
  ] as [number,number][]) chair(cx2, cy2);

  for (let i = 0; i < 3; i++) screen(504 + i * 70, 310, 36, 22);  // laptops

  // Whiteboard left wall
  ctx.fillStyle = "#F0ECD8"; ctx.fillRect(450, 262, 20, 110);
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1; ctx.strokeRect(450, 262, 20, 110);
  ctx.strokeStyle = "#2840D8"; ctx.lineWidth = 1.5;
  for (let li = 0; li < 4; li++) { ctx.beginPath(); ctx.moveTo(453, 278 + li * 22); ctx.lineTo(467, 278 + li * 22); ctx.stroke(); }

  screen(756, 262, 18, 110);         // TV right wall

  ctx.fillStyle = p.deskMid; ctx.fillRect(682, 246, 68, 24);  // coffee station
  ctx.fillStyle = p.deskDark; ctx.fillRect(700, 248, 20, 20);
  screen(701, 249, 18, 8);

  // ══ LOUNGE (900,560 → 1200,800) ══════════════════════════════════════════════

  ctx.fillStyle = p.rugCool; ctx.fillRect(910, 570, 286, 226);

  ctx.fillStyle = p.sofaFill; ctx.fillRect(910, 576, 176, 52);
  ctx.strokeStyle = p.sofaStroke; ctx.lineWidth = 2; ctx.strokeRect(910, 576, 176, 52);
  ctx.fillStyle = p.sofaFill; ctx.fillRect(1048, 576, 52, 122);
  ctx.strokeRect(1048, 576, 52, 122);
  ctx.fillStyle = p.cushionFill;
  for (let i = 0; i < 3; i++) ctx.fillRect(916 + i * 56, 578, 48, 16);
  ctx.fillRect(1052, 580, 42, 26); ctx.fillRect(1052, 612, 42, 26);

  ctx.fillStyle = p.sofaFill; ctx.fillRect(910, 650, 58, 48);
  ctx.strokeStyle = p.sofaStroke; ctx.lineWidth = 1.5; ctx.strokeRect(910, 650, 58, 48);
  ctx.fillStyle = p.cushionFill; ctx.fillRect(914, 656, 50, 30);

  desk(920, 638, 116, 58);           // coffee table
  ctx.fillStyle = p.mugFill; ctx.fillRect(938, 650, 12, 16);  // mug
  screen(960, 646, 34, 22);          // laptop

  ctx.fillStyle = p.tvFill; ctx.fillRect(907, 566, 100, 56);
  screen(910, 569, 94, 50);          // TV

  plant(1158, 736, 14);
  plant(1102, 572, 10);

  // ══ LAMBORGHINIS ══════════════════════════════════════════════════════════════
  drawLambo(ctx, 382, 62, "#1565C0", false);
  drawLambo(ctx, 818, 62, "#C62828", true);

  // ══ STRUCTURAL COLUMNS ════════════════════════════════════════════════════════
  for (const c of [{x:420,y:220},{x:780,y:220},{x:420,y:520},{x:780,y:520}]) {
    ctx.fillStyle = p.wallFill; ctx.fillRect(c.x - 10, c.y - 10, 20, 20);
    ctx.fillStyle = p.wallHighlight; ctx.fillRect(c.x - 10, c.y - 10, 20, 2);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.strokeRect(c.x - 10, c.y - 10, 20, 20);
  }

  // ══ PRIVATE OFFICE 2 (900,0 → 1200,280) ══════════════════════════════════════

  drawRug3D(ctx, 1045, 195, 162, 100, officeStyles[1]);

  // Whiteboard right wall
  ctx.fillStyle = "#F0ECD8"; ctx.fillRect(1162, 8, 28, 160);
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1; ctx.strokeRect(1162, 8, 28, 160);
  ctx.strokeStyle = "#2840D8"; ctx.lineWidth = 1.5;
  for (let li = 0; li < 5; li++) { const lw = [22,18,20,14,20][li]; ctx.beginPath(); ctx.moveTo(1165, 22 + li * 26); ctx.lineTo(1165 + lw, 22 + li * 26); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,238,88,0.9)"; ctx.fillRect(1165, 148, 12, 10);
  ctx.fillStyle = "rgba(128,203,196,0.9)"; ctx.fillRect(1179, 146, 12, 10);

  ctx.fillStyle = p.deskMid; ctx.fillRect(930, 138, 218, 52);  // straight desk
  ctx.fillStyle = p.deskLight; ctx.fillRect(930, 138, 218, 4);
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1; ctx.strokeRect(930, 138, 218, 52);

  screen(960, 140, 40, 26);          // monitor 1
  screen(1006, 140, 40, 26);         // monitor 2

  ctx.fillStyle = "#2a2a2a"; ctx.fillRect(1052, 163, 56, 13);  // keyboard

  // Mesh chair
  ctx.fillStyle = "#546E7A"; ctx.fillRect(1086, 218, 44, 36);
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 0.6;
  for (let mi = 0; mi < 4; mi++) {
    ctx.beginPath(); ctx.moveTo(1090, 222 + mi * 8); ctx.lineTo(1126, 222 + mi * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1090 + mi * 10, 220); ctx.lineTo(1090 + mi * 10, 252); ctx.stroke();
  }
  ctx.fillStyle = "#455A64"; ctx.fillRect(1082, 240, 52, 20);
  ctx.strokeStyle = "#37474F"; ctx.lineWidth = 1.5;
  ctx.strokeRect(1086, 218, 44, 36); ctx.strokeRect(1082, 240, 52, 20);

  // Bean bag
  ctx.fillStyle = "#E64A19";
  ctx.beginPath(); ctx.ellipse(928, 252, 26, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath(); ctx.ellipse(920, 244, 14, 9, -0.4, 0, Math.PI * 2); ctx.fill();

  // Standing lamp
  ctx.fillStyle = p.deskDark; ctx.beginPath(); ctx.arc(910, 246, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(908, 198, 4, 48);
  ctx.fillStyle = p.mugFill; ctx.fillRect(900, 192, 22, 10);

  // Cactus
  ctx.fillStyle = p.plantPot; ctx.fillRect(1148, 244, 26, 26);
  ctx.fillStyle = "#3D8B37"; ctx.fillRect(1157, 215, 10, 32);
  ctx.fillRect(1145, 226, 14, 6); ctx.fillRect(1143, 216, 6, 12);
  ctx.fillRect(1167, 230, 14, 6); ctx.fillRect(1177, 220, 6, 12);

  win(984, 8, 128, 20);              // window
}

// ─── Lamborghini (top-down) ───────────────────────────────────────────────────
function drawLambo(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, flip: boolean) {
  ctx.save();
  if (flip) {
    ctx.translate(cx * 2, 0);
    ctx.scale(-1, 1);
  }

  const W = 108, H = 48;
  const x = cx - W / 2, y = cy - H / 2;

  // Drop shadow
  shadow(ctx, "rgba(0,0,0,0.55)", 14);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  rr(ctx, x + 6, y + 8, W, H, 5); ctx.fill();
  noShadow(ctx);

  // Body — angular Lambo silhouette (nose points right)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x,         y + H * 0.38);  // rear-left top
  ctx.lineTo(x + 10,    y + 2);          // rear top-left corner
  ctx.lineTo(x + W * 0.78, y + 2);       // shoulder top
  ctx.lineTo(x + W,     y + H * 0.32);   // nose top
  ctx.lineTo(x + W,     y + H * 0.68);   // nose bottom
  ctx.lineTo(x + W * 0.78, y + H - 2);   // shoulder bottom
  ctx.lineTo(x + 10,    y + H - 2);      // rear bottom-left corner
  ctx.lineTo(x,         y + H * 0.62);   // rear-left bottom
  ctx.closePath();
  ctx.fill();

  // Body highlight (specular gloss strip)
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 4);
  ctx.lineTo(x + W * 0.76, y + 4);
  ctx.lineTo(x + W * 0.65, y + H * 0.28);
  ctx.lineTo(x + 14, y + H * 0.28);
  ctx.closePath();
  ctx.fill();

  // Roof/cabin (dark center panel)
  ctx.fillStyle = "rgba(10,10,15,0.88)";
  ctx.beginPath();
  ctx.moveTo(x + W * 0.24, y + H * 0.18);
  ctx.lineTo(x + W * 0.7,  y + H * 0.1);
  ctx.lineTo(x + W * 0.82, y + H * 0.34);
  ctx.lineTo(x + W * 0.82, y + H * 0.66);
  ctx.lineTo(x + W * 0.7,  y + H * 0.9);
  ctx.lineTo(x + W * 0.24, y + H * 0.82);
  ctx.lineTo(x + W * 0.18, y + H * 0.66);
  ctx.lineTo(x + W * 0.18, y + H * 0.34);
  ctx.closePath();
  ctx.fill();

  // Windshield (front glass — angled inward)
  ctx.fillStyle = "rgba(140,215,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(x + W * 0.7,  y + H * 0.12);
  ctx.lineTo(x + W * 0.84, y + H * 0.3);
  ctx.lineTo(x + W * 0.84, y + H * 0.7);
  ctx.lineTo(x + W * 0.7,  y + H * 0.88);
  ctx.closePath();
  ctx.fill();

  // Rear window
  ctx.fillStyle = "rgba(80,140,200,0.4)";
  ctx.beginPath();
  ctx.moveTo(x + W * 0.24, y + H * 0.2);
  ctx.lineTo(x + W * 0.18, y + H * 0.34);
  ctx.lineTo(x + W * 0.18, y + H * 0.66);
  ctx.lineTo(x + W * 0.24, y + H * 0.8);
  ctx.closePath();
  ctx.fill();

  // Wheels (4 corners)
  const wheels: [number, number][] = [
    [x + 4,       y + 2],
    [x + 4,       y + H - 12],
    [x + W - 22,  y + 2],
    [x + W - 22,  y + H - 12],
  ];
  for (const [wx, wy] of wheels) {
    ctx.fillStyle = "#111";
    rr(ctx, wx, wy, 18, 10, 2); ctx.fill();
    ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 0.5;
    rr(ctx, wx, wy, 18, 10, 2); ctx.stroke();
    // Rim
    ctx.fillStyle = "#d0d0d0";
    ctx.beginPath(); ctx.arc(wx + 9, wy + 5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#bbb"; ctx.lineWidth = 0.7;
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx + 9, wy + 5);
      ctx.lineTo(wx + 9 + Math.cos(a) * 3.8, wy + 5 + Math.sin(a) * 3.8);
      ctx.stroke();
    }
  }

  // Headlights (right / front)
  ctx.fillStyle = "rgba(255,255,200,0.95)";
  ctx.beginPath(); ctx.ellipse(x + W - 3, y + H * 0.3, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + W - 3, y + H * 0.7, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  // Headlight glow
  const hg = ctx.createRadialGradient(x + W, cy, 0, x + W, cy, 22);
  hg.addColorStop(0, "rgba(255,255,180,0.18)");
  hg.addColorStop(1, "transparent");
  ctx.fillStyle = hg; ctx.fillRect(x + W - 22, y - 10, 40, H + 20);

  // Taillights (left / rear)
  ctx.fillStyle = "rgba(215,25,25,0.9)";
  ctx.fillRect(x + 3, y + H * 0.22, 7, 6);
  ctx.fillRect(x + 3, y + H * 0.72, 7, 6);

  // Rear spoiler
  ctx.fillStyle = color;
  ctx.fillRect(x - 6, y + H * 0.26, 7, H * 0.48);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - 6, y + H * 0.26, 7, 2);
  ctx.fillRect(x - 6, y + H * 0.26 + H * 0.48 - 2, 7, 2);

  // Side vent slits (Lambo detail)
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
  for (let v = 0; v < 3; v++) {
    ctx.beginPath();
    ctx.moveTo(x + 14, y + H * 0.28 + v * 3);
    ctx.lineTo(x + 22, y + H * 0.28 + v * 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 14, y + H * 0.68 + v * 3);
    ctx.lineTo(x + 22, y + H * 0.68 + v * 3);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Avatar — 16-bit pixel-art sprite (8×16 grid at PS=3 → 24×48 px) ─────────
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  user: User,
  isMe: boolean,
  _p: P,
  speakingLevel: number,
  now: number,
  isMoving: boolean,
  isSitting: boolean
) {
  const statusColor = STATUS_COLORS[user.status];

  // Deterministic per-user colours — SNES-era saturated palette
  const hash = user.name.split("").reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0, 17);
  const OUTFITS = ["#D03060","#1870B8","#208038","#C87820","#6830A8","#1888A8","#C02020","#205870","#A02878","#187850"];
  const HAIRS   = ["#200808","#101010","#583018","#900808","#101820","#380860","#982808","#0C1820"];
  const SKINS   = ["#E8C088","#D8A860","#B88048","#906840","#F0D8A8","#C8A878"];

  const outfitColor = isMe ? "#4838D8" : OUTFITS[Math.abs(hash)     % OUTFITS.length];
  const hairColor   =                    HAIRS  [Math.abs(hash >> 3) % HAIRS.length];
  const skinColor   =                    SKINS  [Math.abs(hash >> 6) % SKINS.length];
  const pantsColor  = isMe ? "#302090" : OUTFITS[Math.abs(hash >> 9) % OUTFITS.length];
  const outlineDark = "#080408"; // universal sprite outline

  // ── Pixel sprite data — 8 cols × 16 rows ─────────────────────────────────
  // Values: 0=transparent 1=skin 2=hair 3=shirt 4=pants 5=shoe 6=outline 7=eye
  //         8=shirt_shadow 9=pants_shadow
  const BODY: number[][] = [
    [0,0,6,6,6,6,0,0],  //  0 hair top outline
    [0,6,2,2,2,2,6,0],  //  1 hair
    [6,2,2,2,2,2,2,6],  //  2 hair wide
    [6,2,1,1,1,1,2,6],  //  3 face top (hair sides)
    [0,6,1,7,1,7,6,0],  //  4 face — eyes (7=dark)
    [0,6,1,1,1,1,6,0],  //  5 face lower
    [0,0,6,1,1,6,0,0],  //  6 chin/neck
    [0,6,3,3,3,3,6,0],  //  7 shirt collar
    [6,3,3,3,3,3,3,6],  //  8 shirt body
    [6,8,3,3,3,3,8,6],  //  9 shirt lower (shadow sides)
    [6,8,3,3,3,3,8,6],  // 10 shirt bottom
  ];

  // Walk cycle — two leg frames alternated every 180 ms while moving
  const LEGS_STRIDE: number[][] = [
    [0,6,4,6,6,4,6,0],  // pants top
    [0,6,4,0,0,4,6,0],  // legs apart
    [0,6,9,0,0,9,6,0],  // legs lower
    [0,6,5,6,6,5,6,0],  // shoes at sides
    [6,5,5,6,6,5,5,6],  // shoe base wide
  ];
  const LEGS_STEP: number[][] = [
    [0,0,6,4,4,6,0,0],  // both legs centre
    [0,0,4,4,4,4,0,0],  // together
    [0,0,9,4,4,9,0,0],  // lower together
    [0,0,6,5,5,6,0,0],  // shoes together
    [0,0,5,5,5,5,0,0],  // shoe base
  ];
  // Sitting: legs horizontal, arms reaching forward for typing
  const typingFrame = Math.floor(now / 300) % 2;
  const LEGS_SIT: number[][] = [
    [6,4,4,4,4,4,4,6],  // lap (horizontal)
    [4,4,0,0,0,0,4,4],  // legs to sides
    [9,9,0,0,0,0,9,9],  // lower
    [5,5,6,0,0,6,5,5],  // shoes wide
    [0,0,0,0,0,0,0,0],  // hidden by chair
  ];
  // Arms row (row 9 gets animated when typing)
  const TYPING_A = [6,8,3,3,3,3,8,6];  // arms rest
  const TYPING_B = [6,3,3,3,3,3,3,6];  // arms lean forward (slightly different shade)

  const bodyRows = [...BODY];
  if (isSitting) bodyRows[9] = typingFrame === 0 ? TYPING_A : TYPING_B;

  const legFrame = isMoving ? Math.floor(now / 180) % 2 : 0;
  const LEGS = isSitting ? LEGS_SIT : (legFrame === 0 ? LEGS_STRIDE : LEGS_STEP);
  const SPR = [...bodyRows, ...LEGS];

  // Sitting: shift sprite downward slightly (character sinks into chair)
  const sitOffsetY = isSitting ? 4 : 0;

  const PS = 3; // each sprite pixel = 3×3 canvas pixels

  // colour lookup — index matches SPR values
  const COLS: (string | null)[] = [
    null,             // 0 transparent
    skinColor,        // 1 skin
    hairColor,        // 2 hair
    outfitColor,      // 3 shirt
    pantsColor,       // 4 pants
    "#181010",        // 5 shoe
    outlineDark,      // 6 outline
    "#080808",        // 7 eye dark
    shadeColor(outfitColor, -30), // 8 shirt shadow
    shadeColor(pantsColor,  -30), // 9 pants shadow
  ];

  // Top-left of 8×16 sprite — feet land at y, center at x
  const ox = Math.round(x) - 4 * PS;
  const oy = Math.round(y) - 15 * PS + sitOffsetY;

  // ── Ground shadow ─────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(ox + 2, oy + 16 * PS, 22, 3);

  // ── Draw sprite pixels ─────────────────────────────────────────────────
  for (let row = 0; row < SPR.length; row++) {
    for (let col = 0; col < SPR[row].length; col++) {
      const v = SPR[row][col];
      const c = COLS[v];
      if (c === null) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + col * PS, oy + row * PS, PS, PS);
    }
  }

  // ── Name label + mic icon ─────────────────────────────────────────────
  const firstName = user.name.split(" ")[0];
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tw = ctx.measureText(firstName).width;
  const nw = tw + 12;
  const nx = Math.round(x);
  const ny = oy - 14;

  // White pill name tag — Gather.town style
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(nx - (nw >> 1) + 1, ny - 5, nw + 2, 13);
  // White background pill
  ctx.fillStyle = isMe ? "#E8F0FF" : "#F0F0EE";
  ctx.fillRect(nx - (nw >> 1) - 1, ny - 6, nw + 2, 13);
  // Blue left accent bar for self
  if (isMe) {
    ctx.fillStyle = "#4488FF";
    ctx.fillRect(nx - (nw >> 1) - 1, ny - 6, 3, 13);
  }
  // Name text (dark on white)
  ctx.fillStyle = isMe ? "#1A2A5A" : "#111111";
  ctx.fillText(firstName, isMe ? nx + 1 : nx, ny);

  // ── Pixel-art microphone icon (right of name label) ────────────────────
  // 5 wide × 7 tall at 2px = 10×14 — placed just right of name box
  const micX = nx + (nw >> 1) + 5;
  const micY = ny - 7;
  const MS = 2; // mic pixel size
  // Mic colour: green=speaking, red=muted, grey=normal
  const micColor = user.isMuted ? "#F82020" : (speakingLevel > 0.05 ? "#20F860" : "#807090");

  // Mic body (capsule: 3×4 centre)
  ctx.fillStyle = "#000000";
  ctx.fillRect(micX + 1 * MS - 1, micY - 1, 3 * MS + 2, 4 * MS + 2);
  ctx.fillStyle = micColor;
  ctx.fillRect(micX + 1 * MS, micY, 3 * MS, 4 * MS);
  // Slightly lighter top highlight
  ctx.fillStyle = "#FFFFFF44";
  ctx.fillRect(micX + 1 * MS, micY, MS, 2 * MS);
  // Stem
  ctx.fillStyle = micColor;
  ctx.fillRect(micX + 2 * MS, micY + 4 * MS, MS, 2 * MS);
  // Base stand
  ctx.fillRect(micX + MS, micY + 6 * MS, 3 * MS, MS);

  // Muted: red slash across mic
  if (user.isMuted) {
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(micX, micY + 3 * MS, 5 * MS, MS);
  }

  // Speaking signals — stacked horizontal bars fading outward
  if (speakingLevel > 0.05 && !user.isMuted) {
    const wave = Math.floor(now / 150) % 3; // 0,1,2 bars animated
    const sigX = micX + 5 * MS + 2;
    ctx.fillStyle = "#20F860";
    // Bar 1 (close, always shown)
    ctx.fillRect(sigX, micY + MS, MS, 3 * MS);
    // Bar 2 (medium, shown when wave >= 1)
    if (wave >= 1) ctx.fillRect(sigX + MS + 1, micY, MS, 5 * MS);
    // Bar 3 (far, shown when wave >= 2)
    if (wave >= 2) ctx.fillRect(sigX + 2 * (MS + 1), micY - MS, MS, 7 * MS);
  }

  // ── Status dot — small square bottom-right of sprite ─────────────────
  const sx = ox + 8 * PS + 2;
  const sy = oy + 8 * PS;
  ctx.fillStyle = "#000000";
  ctx.fillRect(sx - 1, sy - 1, 7, 7);
  ctx.fillStyle = statusColor;
  ctx.fillRect(sx, sy, 5, 5);
}

/** Darken/lighten a hex colour by `amount` (negative = darker). */
function shadeColor(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#",""), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xFF) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xFF) + amount));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ─── Zone indicator ───────────────────────────────────────────────────────────

// ─── Buttons near office doors ─────────────────────────────────────────────────
// Office 1: door on right wall (x=300), outside is x>300
const DOOR1_CENTER = { x: PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w, y: DOOR.y + DOOR.h / 2 };
const KNOCK_BTN_1 = { x: 308, y: 118, w: 72, h: 28 } as const;
const LOCK_BTN_1  = { x: 308, y: 82,  w: 88, h: 28 } as const;

// Office 2: door on left wall (x=900), outside is x<900
const DOOR2_CENTER = { x: PRIVATE_OFFICE_2_ZONE.x, y: DOOR_2.y + DOOR_2.h / 2 };
const KNOCK_BTN_2 = { x: 820, y: 118, w: 72, h: 28 } as const;
const LOCK_BTN_2  = { x: 804, y: 82,  w: 88, h: 28 } as const;

const BTN_RANGE = 130;

// ─── Chair sit positions (centre of seat) ─────────────────────────────────────
const SIT_SPOTS = [
  { x: 92,   y: 252 },   // Office 1 executive chair
  { x: 1108, y: 252 },   // Office 2 executive chair
] as const;
const SIT_RADIUS = 22;

function drawCanvasBtn(
  ctx: CanvasRenderingContext2D,
  btn: { x: number; y: number; w: number; h: number },
  label: string,
  _color: string
) {
  const { x, y, w, h } = btn;
  // NES-style dialog box: black border → dark bg → bright inner border
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = "#180C28";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = "#2C1848";
  ctx.fillRect(x, y, w, h);
  // Top-left bright corner
  ctx.fillStyle = "#F8C820";
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + 2, 2, h - 4);
  // Bottom-right dark corner
  ctx.fillStyle = "#604010";
  ctx.fillRect(x + 2, y + h - 2, w - 2, 2);
  ctx.fillRect(x + w - 2, y + 2, 2, h - 4);
  // Text
  ctx.fillStyle = "#F8F0A8";
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  room: Room;
  myUserId: string | null;
  myPosition: Position2D | null;
  myOfficeIndex: -1 | 0 | 1;
  offices: [OfficeAssignment, OfficeAssignment];
  onMove: (position: Position2D) => void;
  onStatusChange: (status: UserStatus) => void;
  onZoneChange: (zone: string) => void;
  privateOfficeDoorClosed: boolean;
  onDoorToggle: () => void;
  onKnock: (targetUserIds: string[]) => void;
  onLockOffice: (officeIndex: 0 | 1) => void;
  isDark: boolean;
  speakingNames: Set<string>;
}

export function OfficeCanvas({
  room, myUserId, myPosition,
  myOfficeIndex, offices,
  onMove, onZoneChange,
  privateOfficeDoorClosed, onDoorToggle, onKnock, onLockOffice,
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

  // Per-user smooth speaking level: 0 = silent, 1 = fully speaking
  // Attack is fast (0.25/frame), decay is slow (0.07/frame) for natural fade-out
  const speakingLevelsRef = useRef<Map<string, number>>(new Map());

  const officesRef = useRef(offices);
  useEffect(() => { officesRef.current = offices; }, [offices]);

  const myOfficeIndexRef = useRef(myOfficeIndex);
  useEffect(() => { myOfficeIndexRef.current = myOfficeIndex; }, [myOfficeIndex]);

  const onLockOfficeRef = useRef(onLockOffice);
  useEffect(() => { onLockOfficeRef.current = onLockOffice; }, [onLockOffice]);

  // Track which canvas buttons are currently shown for click detection
  const showKnock1Ref = useRef(false);
  const showKnock2Ref = useRef(false);
  const showLock1Ref  = useRef(false);
  const showLock2Ref  = useRef(false);

  // Sitting state — null = standing, object = locked to chair position
  const sittingRef = useRef<{ x: number; y: number } | null>(null);

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

    // While sitting: block all movement; space key handled in onKeyDown
    if (!sittingRef.current) {
      if (keys.has("w") || keys.has("arrowup"))    { y -= SPEED * dt; moved = true; }
      if (keys.has("s") || keys.has("arrowdown"))  { y += SPEED * dt; moved = true; }
      if (keys.has("a") || keys.has("arrowleft"))  { x -= SPEED * dt; moved = true; }
      if (keys.has("d") || keys.has("arrowright")) { x += SPEED * dt; moved = true; }
    }

    x = Math.max(AVATAR_R, Math.min(CANVAS_W - AVATAR_R, x));
    y = Math.max(AVATAR_R, Math.min(CANVAS_H - AVATAR_R, y));

    // Collision: locked offices are impassable in both directions
    const { x: ox, y: oy } = posRef.current;
    const myIdx = myOfficeIndexRef.current;
    for (let i = 0; i < 2; i++) {
      if (!officesRef.current[i].locked) continue;
      const z = i === 0 ? PRIVATE_OFFICE_ZONE : PRIVATE_OFFICE_2_ZONE;
      const inside = (px: number, py: number) =>
        px > z.x + 7 && px < z.x + z.w - 7 && py > z.y + 7 && py < z.y + z.h - 7;
      const wasInside = inside(ox, oy);
      const nowInside = inside(x, y);
      // Owner: can't cross boundary in either direction
      // Non-owner: can't enter from outside
      const blocked = myIdx === i ? wasInside !== nowInside : (!wasInside && nowInside);
      if (blocked) {
        if (inside(ox, y) === wasInside) x = ox;
        else if (inside(x, oy) === wasInside) y = oy;
        else { x = ox; y = oy; }
      }
    }

    // Auto-sit: walk onto a chair → snap and lock
    if (!sittingRef.current) {
      for (const spot of SIT_SPOTS) {
        if ((x - spot.x) ** 2 + (y - spot.y) ** 2 < SIT_RADIUS ** 2) {
          sittingRef.current = { x: spot.x, y: spot.y };
          x = spot.x; y = spot.y;
          break;
        }
      }
    }
    // If sitting, keep position pinned to chair
    if (sittingRef.current) {
      x = sittingRef.current.x;
      y = sittingRef.current.y;
      moved = false;
    }

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
    ctx.imageSmoothingEnabled = false; // crisp pixel art — no anti-aliasing on scaled content
    ctx.scale(sx, sy);

    const p = paletteRef.current;
    const offs = officesRef.current;
    drawBackground(ctx, p);
    drawZones(ctx, doorClosedRef.current, p, offs);
    drawLights(ctx, p);
    drawFurniture(ctx, p, [offs[0].style ?? 0, offs[1].style ?? 0]);

    const alpha = 1 - Math.exp(-dt * LERP_SPEED);
    const myId = myUserIdRef.current;
    const speaking = speakingNamesRef.current;
    const levels = speakingLevelsRef.current;

    // Update smooth speaking levels for all users this frame
    for (const user of roomRef.current.users) {
      const isSpeaking = speaking.has(user.name);
      const prev = levels.get(user.id) ?? 0;
      // Fast attack (0.25), slow decay (0.07)
      const next = isSpeaking
        ? Math.min(1, prev + 0.25)
        : Math.max(0, prev - 0.07);
      if (next === 0) levels.delete(user.id);
      else levels.set(user.id, next);
    }

    for (const user of roomRef.current.users) {
      if (user.id === myId) continue;
      const target = pctToPx(user.position);
      const cur = interpRef.current.get(user.id) ?? target;
      const ix = cur.x + (target.x - cur.x) * alpha;
      const iy = cur.y + (target.y - cur.y) * alpha;
      interpRef.current.set(user.id, { x: ix, y: iy });
      const otherMoving = Math.abs(target.x - ix) + Math.abs(target.y - iy) > 1;
      drawAvatar(ctx, ix, iy, user, false, p, levels.get(user.id) ?? 0, time, otherMoving, false);
    }

    const meUser = roomRef.current.users.find((u) => u.id === myId);
    if (meUser) drawAvatar(ctx, x, y, meUser, true, p, levels.get(meUser.id) ?? 0, time, moved, !!sittingRef.current);

    const d1 = Math.sqrt((x - DOOR1_CENTER.x) ** 2 + (y - DOOR1_CENTER.y) ** 2);
    const d2 = Math.sqrt((x - DOOR2_CENTER.x) ** 2 + (y - DOOR2_CENTER.y) ** 2);

    showLock1Ref.current = false;
    showLock2Ref.current = false;

    // Knock buttons (non-owner outside a locked door)
    const sK1 = myIdx !== 0 && offs[0].locked && zone !== "Private Office" && d1 <= BTN_RANGE;
    const sK2 = myIdx !== 1 && offs[1].locked && zone !== "Private Office 2" && d2 <= BTN_RANGE;
    showKnock1Ref.current = sK1;
    showKnock2Ref.current = sK2;
    if (sK1) drawCanvasBtn(ctx, KNOCK_BTN_1, "KNOCK", "rgba(255,140,0,0.9)");
    if (sK2) drawCanvasBtn(ctx, KNOCK_BTN_2, "KNOCK", "rgba(255,140,0,0.9)");

    // Show "sit" prompt near chairs when standing close but not yet sitting
    if (!sittingRef.current) {
      for (const spot of SIT_SPOTS) {
        const dist = Math.sqrt((x - spot.x) ** 2 + (y - spot.y) ** 2);
        if (dist < SIT_RADIUS + 30) {
          drawCanvasBtn(ctx, { x: spot.x - 44, y: spot.y - 48, w: 88, h: 22 }, "WALK TO SIT", "");
        }
      }
    }
    // "Stand up" hint while seated
    if (sittingRef.current) {
      drawCanvasBtn(ctx, { x: x - 58, y: y - 56, w: 116, h: 22 }, "SPACE = STAND UP", "");
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      // Space = stand up from chair
      if (e.key === " " && sittingRef.current) {
        e.preventDefault();
        const { x: sx, y: sy } = sittingRef.current;
        sittingRef.current = null;
        // Nudge upward (toward desk) so player stays inside the office
        // and the auto-sit radius check doesn't immediately retrigger
        posRef.current = { x: sx, y: sy - SIT_RADIUS - 8 };
        return;
      }
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

    function hits(btn: { x: number; y: number; w: number; h: number }) {
      return cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h;
    }

    // Lock / unlock office 1
    if (showLock1Ref.current && hits(LOCK_BTN_1)) {
      onLockOfficeRef.current(0); return;
    }
    // Lock / unlock office 2
    if (showLock2Ref.current && hits(LOCK_BTN_2)) {
      onLockOfficeRef.current(1); return;
    }

    // Knock on office 1
    if (showKnock1Ref.current && hits(KNOCK_BTN_1)) {
      const occupants = roomRef.current.users
        .filter((u) => {
          if (u.id === myUserIdRef.current) return false;
          const px = pctToPx(u.position);
          return detectZone(px.x, px.y) === "Private Office";
        })
        .map((u) => u.id);
      onKnockRef.current(occupants); return;
    }

    // Knock on office 2
    if (showKnock2Ref.current && hits(KNOCK_BTN_2)) {
      const occupants = roomRef.current.users
        .filter((u) => {
          if (u.id === myUserIdRef.current) return false;
          const px = pctToPx(u.position);
          return detectZone(px.x, px.y) === "Private Office 2";
        })
        .map((u) => u.id);
      onKnockRef.current(occupants); return;
    }

    // Door toggle (office 1)
    if (cx >= DOOR.x && cx <= DOOR.x + DOOR.w && cy >= DOOR.y && cy <= DOOR.y + DOOR.h) {
      onDoorToggleRef.current(); return;
    }
    // Door toggle (office 2)
    if (cx >= DOOR_2.x && cx <= DOOR_2.x + DOOR_2.w && cy >= DOOR_2.y && cy <= DOOR_2.y + DOOR_2.h) {
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
