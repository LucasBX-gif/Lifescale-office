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
    // ── Base floor (dark stone — Pokémon dungeon) ────────────────────────────
    bg:            "#18140C",
    tile1:         "#201A10",
    tile2:         "#281E14",
    grout:         "#100C08",
    pathFill:      "#302418",
    // ── Room floors ──────────────────────────────────────────────────────────
    wood1:         "#884820",
    wood2:         "#A05828",
    woodGrain:     "#602808",
    warmCarpet:    "#883020",
    warmCarpetAlt: "#702818",
    warmCarpetLine:"#A84030",
    coolCarpet:    "#185848",
    coolCarpetAlt: "#104038",
    coolCarpetLine:"#208868",
    // ── Walls (SNES flat — no gradients) ─────────────────────────────────────
    wallFill:      "#503020",
    wallHighlight: "#785038",  // top/left bright face
    wallShadow:    "#281408",  // bottom/right shadow face
    wallBorder:    "#C89050",
    // ── Ceiling light markers ─────────────────────────────────────────────────
    lightGlow:     "#F8E890",
    lightFixture:  "#F0D060",
    lightRing:     "#C8A828",
    // ── Zone labels ──────────────────────────────────────────────────────────
    zoneLabel:     "#E8D890",
    // ── Avatar / UI ──────────────────────────────────────────────────────────
    avatarFill:    "#584028",
    avatarMeFill:  "#5848D8",
    label:         "#F0E8D0",
    labelMuted:    "#A09070",
    indicator:     "#201408",
    indicatorTxt:  "#F0E8D0",
    // ── Furniture ────────────────────────────────────────────────────────────
    deskDark:      "#583010",
    deskMid:       "#784018",
    deskLight:     "#A05820",
    deskEdge:      "#C07828",
    chairFill:     "#281808",
    chairStroke:   "#705030",
    screenFill:    "#080C20",
    screenGlow:    "#3060E8",
    screenGlowOut: "#102880",
    tableWar:      "#503010",
    tableWarEdge:  "#A06020",
    chairWarFill:  "#601010",
    chairWarStroke:"#C04030",
    sofaFill:      "#104838",
    sofaStroke:    "#208868",
    cushionFill:   "#186050",
    coffeeTable:   "#583818",
    tvFill:        "#080810",
    tvScreen:      "#1830B0",
    plantPot:      "#784018",
    plantLeaf:     "#18A030",
    plantLeaf2:    "#28C040",
    bookShelf:     "#402808",
    bookEdge:      "#704018",
    rugWarm:       "rgba(200,130,55,0.08)",
    rugCool:       "rgba(40,190,140,0.08)",
    shadow:        "rgba(0,0,0,0.55)",
    doorFill:      "#A07030",
    doorText:      "#F0D880",
    counterFill:   "#503018",
    counterTop:    "#704020",
    sinkFill:      "#284858",
    glassBlue:     "#4898D8",
    mugFill:       "#D8B020",
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

// ─── Nature — grass tufts + pixel-art trees ───────────────────────────────────

// ─── Nature — proper grass patches and trees ──────────────────────────────────

function drawTree(ctx: CanvasRenderingContext2D, cx: number, cy: number, isDark: boolean, scale = 1) {
  const R = 30 * scale; // foliage radius

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy + R * 0.35, R * 0.85, R * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  const tw = 8 * scale, th = 18 * scale;
  ctx.fillStyle = isDark ? "#4A2810" : "#7A4820";
  ctx.fillRect(cx - tw / 2, cy - th * 0.3, tw, th);
  // Trunk highlight
  ctx.fillStyle = isDark ? "#6A3C18" : "#A06430";
  ctx.fillRect(cx - tw / 2, cy - th * 0.3, tw * 0.35, th);

  // Foliage — three layered circles for depth
  // Outer/shadow ring
  ctx.fillStyle = isDark ? "#0E3808" : "#1A5C10";
  ctx.beginPath();
  ctx.arc(cx, cy - R * 0.55, R, 0, Math.PI * 2);
  ctx.fill();

  // Main canopy
  ctx.fillStyle = isDark ? "#1E6C14" : "#2E9C1C";
  ctx.beginPath();
  ctx.arc(cx, cy - R * 0.65, R * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Mid highlight
  ctx.fillStyle = isDark ? "#2A9020" : "#42C028";
  ctx.beginPath();
  ctx.arc(cx - R * 0.2, cy - R * 0.8, R * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Top shine
  ctx.fillStyle = isDark ? "#38B82A" : "#5CE038";
  ctx.beginPath();
  ctx.arc(cx - R * 0.25, cy - R * 0.95, R * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrassPatch(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, isDark: boolean) {
  // Base patch — filled ellipse
  ctx.fillStyle = isDark ? "#1C5010" : "#2E8018";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lighter inner glow
  ctx.fillStyle = isDark ? "#267018" : "#3EA022";
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.1, cy - ry * 0.1, rx * 0.65, ry * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright highlight spot top-left
  ctx.fillStyle = isDark ? "#30901E" : "#52C030";
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.25, cy - ry * 0.3, rx * 0.3, ry * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawNature(ctx: CanvasRenderingContext2D, p: P) {
  const isDark = p.bg === "#18140C";

  // ── Grass patches — large organic blobs in open floor areas ──────────────
  const grassPatches: [number, number, number, number][] = [
    // [cx, cy, rx, ry]
    // Top strip between offices
    [355, 45,  55, 28], [500, 30,  70, 24], [650, 50,  50, 22], [820, 35,  60, 26],
    // Left of War Room
    [345, 310, 40, 30], [380, 450, 55, 28], [330, 520, 45, 22],
    // Right of War Room
    [855, 320, 45, 28], [830, 440, 55, 26], [858, 520, 40, 22],
    // Bottom open area
    [80,  640, 70, 35], [240, 690, 80, 32], [400, 650, 65, 30],
    [550, 680, 75, 34], [700, 645, 60, 28], [840, 700, 65, 30],
    // Far left strip
    [28, 360, 30, 50], [32, 490, 28, 45],
  ];

  for (const [cx, cy, rx, ry] of grassPatches) {
    drawGrassPatch(ctx, cx, cy, rx, ry, isDark);
  }

  // ── Trees — placed in and around the grass patches ────────────────────────
  const trees: [number, number, number][] = [
    // [cx, cy, scale]
    // Top strip
    [335, 38, 1.0], [510, 25, 0.9], [645, 42, 1.1], [825, 28, 0.95],
    // Left of War Room
    [342, 305, 1.0], [375, 445, 0.95], [328, 515, 0.85],
    // Right of War Room
    [858, 315, 1.0], [832, 435, 0.9], [860, 515, 0.85],
    // Bottom open area
    [75,  632, 1.1], [242, 682, 1.0], [402, 643, 0.95],
    [552, 672, 1.05],[702, 638, 1.0], [842, 692, 0.9],
    // Far left
    [28,  355, 0.8], [30,  485, 0.75],
  ];

  for (const [cx, cy, scale] of trees) {
    drawTree(ctx, cx, cy, isDark, scale);
  }
}

// ─── Background — 16 px SNES/Pokémon-style flat stone tiles ──────────────────
function drawBackground(ctx: CanvasRenderingContext2D, p: P) {
  const isDark = p.bg === "#18140C";
  const T = 16; // 16 px tiles — classic SNES/GBA tile size

  // Four stone shades — no gradients, purely flat
  const regularTiles = isDark
    ? ["#201A10", "#281E14", "#1C1608", "#302418"] as const
    : ["#B0A068", "#B8A870", "#A89860", "#C0B078"] as const;
  // Corridor / path tiles — clearly warmer/lighter than open floor
  const pathTiles = isDark
    ? ["#382810", "#402E14", "#30220C", "#4A3418"] as const
    : ["#C8B068", "#D0B870", "#C0A860", "#D8C078"] as const;

  // Grout line colour
  ctx.fillStyle = p.grout;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Corridor paths connecting rooms [x1,y1,x2,y2]
  const corridors: [number, number, number, number][] = [
    [300,  90, 900, 195],   // top hall: office 1 door ↔ office 2 door
    [530, 190, 670, 250],   // spine down to War Room
    [750, 480, 920, 580],   // War Room → Lounge connector
  ];
  function inCorridor(px: number, py: number) {
    return corridors.some(([x1,y1,x2,y2]) => px >= x1 && px < x2 && py >= y1 && py < y2);
  }

  // Draw every 16×16 tile — 1 px inset so grout line shows between tiles
  for (let tx = 0; tx < CANVAS_W; tx += T) {
    for (let ty = 0; ty < CANVAS_H; ty += T) {
      const col = tx / T | 0;
      const row = ty / T | 0;
      const v = ((col * 13 + row * 7) ^ (col + row)) & 3;
      ctx.fillStyle = inCorridor(tx + T / 2, ty + T / 2) ? pathTiles[v] : regularTiles[v];
      ctx.fillRect(tx + 1, ty + 1, T - 2, T - 2);
    }
  }

  // Darker 2-px border on corridor edges for the "path" look
  ctx.fillStyle = isDark ? "#100C06" : "#887040";
  for (const [x1,y1,x2,y2] of corridors) {
    ctx.fillRect(x1, y1, x2 - x1, 2);     // top edge
    ctx.fillRect(x1, y2 - 2, x2 - x1, 2); // bottom edge
    ctx.fillRect(x1, y1, 2, y2 - y1);     // left edge
    ctx.fillRect(x2 - 2, y1, 2, y2 - y1); // right edge
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

// Style-specific wall border & rug tint
function officeStyleColors(style: number) {
  switch (style) {
    case 1: return { border: "rgba(212,175,55,0.85)",  rug: "rgba(212,175,55,0.07)"  };
    case 2: return { border: "rgba(0,200,255,0.8)",    rug: "rgba(0,180,255,0.07)"   };
    case 3: return { border: "rgba(140,190,160,0.8)",  rug: "rgba(160,215,185,0.07)" };
    case 4: return { border: "rgba(200,160,25,0.85)",  rug: "rgba(210,170,40,0.07)"  };
    default: return { border: "rgba(185,138,55,0.85)",  rug: "rgba(195,148,60,0.08)"  };
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

    // ── Wall helpers — SNES-style 3-tone flat blocks (no gradients) ───────────
    const FF = 8; // front-face extension (wall "height" visible in room)
    const TF = 3; // top/left highlight strip width

    // Horizontal wall.  roomBelow=true → top wall; shows front face below.
    const wH = (wx: number, wy: number, ww: number, wh2: number, roomBelow: boolean) => {
      // Main body
      ctx.fillStyle = p.wallFill;
      ctx.fillRect(wx, wy, ww, wh2);
      // Top highlight (2-3px bright strip)
      ctx.fillStyle = p.wallHighlight;
      ctx.fillRect(wx, wy, ww, TF);
      if (roomBelow) {
        // Front face — dark strip below wall (shows wall has height, like Pokémon buildings)
        ctx.fillStyle = p.wallShadow;
        ctx.fillRect(wx, wy + wh2, ww, FF);
        // Single-pixel black line at junction for crispness
        ctx.fillStyle = "#000000";
        ctx.fillRect(wx, wy + wh2 + FF, ww, 1);
      } else {
        // Bottom wall — single-pixel shadow on underside
        ctx.fillStyle = p.wallShadow;
        ctx.fillRect(wx, wy + wh2 - 2, ww, 2);
      }
    };

    // Vertical wall.  roomRight=true → left wall; shows right shadow face.
    const wV = (wx: number, wy: number, ww: number, wh2: number, roomRight: boolean) => {
      ctx.fillStyle = p.wallFill;
      ctx.fillRect(wx, wy, ww, wh2);
      ctx.fillStyle = p.wallHighlight;
      ctx.fillRect(wx, wy, TF, wh2);
      if (roomRight) {
        // Right shadow face (3px)
        ctx.fillStyle = p.wallShadow;
        ctx.fillRect(wx + ww, wy, 3, wh2);
        ctx.fillStyle = "#000000";
        ctx.fillRect(wx + ww + 3, wy, 1, wh2);
      }
    };

    if (z.id === "private-office") {
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w;
      wH(x, y, w + WT, WT, true);             // top
      wV(x, y, WT, h, true);                  // left (canvas edge)
      wH(x, y + h, w + WT, WT, false);        // bottom
      wV(wallX, y, WT, DOOR.y - y, true);                           // right-top
      wV(wallX, DOOR.y + DOOR.h, WT, y + h - (DOOR.y + DOOR.h), true); // right-bottom
      drawDoor(ctx, isLocked || doorClosed, p, false);
    } else if (z.id === "private-office-2") {
      const { x, y, w, h } = PRIVATE_OFFICE_2_ZONE;
      const wallX = x;
      wH(x, y, w, WT, true);                  // top
      wV(x, y, WT, h, true);                  // left placeholder
      wV(x + w, y, WT, h + WT, false);        // right (canvas edge)
      wH(x, y + h, w + WT, WT, false);        // bottom
      wV(wallX, y, WT, DOOR_2.y - y, true);                              // left-top
      wV(wallX, DOOR_2.y + DOOR_2.h, WT, y + h - (DOOR_2.y + DOOR_2.h), true); // left-bottom
      drawDoor(ctx, isLocked || doorClosed, p, true);
    } else {
      wH(z.x, z.y, z.w, WT, true);
      wH(z.x, z.y + z.h, z.w, WT, false);
      wV(z.x, z.y, WT, z.h, true);
      wV(z.x + z.w, z.y, WT, z.h + WT, false);
    }

    // ── Inner-room dark border line (1px, pixel-art style) ───────────────────
    const { x: zx, y: zy, w: zw, h: zh } = z;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(zx + WT, zy + WT, zw - WT, 2);     // top inner edge
    ctx.fillRect(zx + WT, zy + WT, 2, zh - WT);     // left inner edge
    ctx.fillRect(zx + zw + WT - 2, zy + WT, 2, zh - WT); // right inner edge
    ctx.fillRect(zx + WT, zy + zh + WT - 2, zw - WT, 2); // bottom inner edge

    // Wall border highlight — style-tinted for private offices
    const borderColor =
      z.id === "private-office"   ? officeStyleColors(offices[0].style ?? 0).border :
      z.id === "private-office-2" ? officeStyleColors(offices[1].style ?? 0).border :
      z.border;
    ctx.strokeStyle = borderColor;
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
    } else if (z.id === "private-office-2") {
      const { x, y, w, h } = PRIVATE_OFFICE_2_ZONE;
      ctx.beginPath();
      ctx.moveTo(x, y + WT); ctx.lineTo(x + w, y + WT);
      ctx.moveTo(x, DOOR_2.y); ctx.lineTo(x, y + WT);
      ctx.moveTo(x, DOOR_2.y + DOOR_2.h); ctx.lineTo(x, y + h);
      ctx.moveTo(x, y + h + WT); ctx.lineTo(x + w, y + h + WT);
      ctx.stroke();
    } else {
      ctx.strokeRect(z.x + WT, z.y + WT, z.w - WT, z.h - WT);
    }
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

// ─── Furniture ────────────────────────────────────────────────────────────────
function drawFurniture(ctx: CanvasRenderingContext2D, p: P, officeStyles: [number, number]) {

  // ══ PRIVATE OFFICE (0,0 → 300,280) ══════════════════════════════════════════

  // Floor rug
  ctx.fillStyle = officeStyleColors(officeStyles[0]).rug;
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

  // ── Monitor (flat top-down: small screen on desk) ────────────────────────────
  ctx.fillStyle = "#000000";
  ctx.fillRect(107, 147, 46, 30);          // outer bezel
  ctx.fillStyle = p.screenFill;
  ctx.fillRect(108, 148, 44, 28);          // screen body
  ctx.fillStyle = p.screenGlow;
  ctx.fillRect(110, 150, 40, 24);          // screen glow
  // Screen content rows (fake UI)
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(112, 152, 28, 4);
  ctx.fillRect(112, 158, 20, 3);
  ctx.fillRect(112, 163, 24, 3);
  ctx.fillRect(134, 158, 12, 8);
  // Stand
  ctx.fillStyle = p.deskMid;
  ctx.fillRect(127, 177, 6, 8);
  ctx.fillRect(121, 184, 18, 3);

  // Keyboard
  ctx.fillStyle = p.chairFill;
  rr(ctx, 152, 170, 44, 14, 2); ctx.fill();
  ctx.strokeStyle = p.chairStroke;
  ctx.lineWidth = 0.5;
  for (let ki = 0; ki < 3; ki++) {
    for (let kj = 0; kj < 7; kj++) {
      rr(ctx, 154 + kj * 6, 172 + ki * 4, 5, 3, 0.5); ctx.stroke();
    }
  }
  // Mouse
  ctx.fillStyle = p.chairFill;
  rr(ctx, 200, 172, 12, 16, 4); ctx.fill();
  ctx.strokeStyle = p.chairStroke; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(200, 180); ctx.lineTo(212, 180); ctx.stroke();

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

  // ── Lamborghinis parked outside each office (above door gap, not blocking entrance) ──
  // Blue — outside Office 1's right wall (door is at y 110-170, car parked above at y≈62)
  drawLambo(ctx, 382, 62, "#1565C0", false);
  // Red — outside Office 2's left wall (mirrored)
  drawLambo(ctx, 818, 62, "#C62828", true);

  // ── Structural columns ────────────────────────────────────────────────────────
  const cols = [{ x: 420, y: 220 }, { x: 780, y: 220 }, { x: 420, y: 520 }, { x: 780, y: 520 }];
  for (const c of cols) {
    shadow(ctx, p.shadow, 8);
    ctx.fillStyle = p.wallFill;
    rr(ctx, c.x - 12, c.y - 12, 24, 24, 2); ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1.5;
    rr(ctx, c.x - 12, c.y - 12, 24, 24, 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(c.x - 10, c.y - 10, 5, 20);
  }

  // ══ PRIVATE OFFICE 2 (900,0 → 1200,280) — mirrored layout ════════════════════

  // Floor rug (mirrored)
  ctx.fillStyle = officeStyleColors(officeStyles[1]).rug;
  rr(ctx, 914, 55, 270, 210, 8); ctx.fill();


  // ── Bookshelf — right wall ────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.bookShelf;
  rr(ctx, 1158, 8, 34, 260, 2); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.bookEdge; ctx.lineWidth = 1;
  rr(ctx, 1158, 8, 34, 260, 2); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = p.bookEdge;
    ctx.fillRect(1158, 58 + i * 50, 34, 3);
  }
  const bookCols2 = ["#06b6d4","#ff8c42","#a855f7","#3dffa0","#ffbe32","#6c63ff","#e05555","#06b6d4","#ff8c42","#a855f7"];
  for (let shelf = 0; shelf < 5; shelf++) {
    let bx = 1160;
    const by = 10 + shelf * 50;
    for (let b = 0; b < 6 && bx < 1190; b++) {
      const bw = 3 + (b * 7 + shelf * 3) % 3;
      ctx.fillStyle = bookCols2[(shelf * 6 + b) % bookCols2.length];
      ctx.fillRect(bx, by + 2, bw, 44);
      bx += bw + 1;
    }
  }

  // ── L-desk (mirrored — main desk runs left, return goes right side) ───────────
  shadow(ctx, p.shadow, 10);
  ctx.fillStyle = p.deskDark;
  rr(ctx, 950, 145, 195, 58, 4); ctx.fill();   // main desk
  rr(ctx, 1081, 185, 64, 75, 4); ctx.fill();   // return
  noShadow(ctx);
  ctx.fillStyle = p.deskLight;
  rr(ctx, 953, 148, 189, 8, 2); ctx.fill();
  rr(ctx, 1084, 188, 58, 8, 2); ctx.fill();
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1.5;
  rr(ctx, 950, 145, 195, 58, 4); ctx.stroke();
  rr(ctx, 1081, 185, 64, 75, 4); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = p.deskEdge;
    rr(ctx, 1104, 200 + i * 18, 20, 5, 2); ctx.fill();
  }

  // ── Monitor (mirrored, same flat top-down style) ─────────────────────────────
  ctx.fillStyle = "#000000";
  ctx.fillRect(1047, 147, 46, 30);
  ctx.fillStyle = p.screenFill;
  ctx.fillRect(1048, 148, 44, 28);
  ctx.fillStyle = p.screenGlow;
  ctx.fillRect(1050, 150, 40, 24);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(1052, 152, 28, 4);
  ctx.fillRect(1052, 158, 20, 3);
  ctx.fillRect(1052, 163, 24, 3);
  ctx.fillRect(1074, 158, 12, 8);
  // Stand
  ctx.fillStyle = p.deskMid;
  ctx.fillRect(1067, 177, 6, 8);
  ctx.fillRect(1061, 184, 18, 3);

  // Keyboard + mouse (mirrored)
  ctx.fillStyle = p.chairFill;
  rr(ctx, 1004, 170, 44, 14, 2); ctx.fill();
  rr(ctx, 988, 172, 12, 16, 4); ctx.fill();

  // ── Chair (mirrored) ──────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 12);
  ctx.fillStyle = p.chairFill;
  rr(ctx, 1086, 218, 44, 36, 6); ctx.fill();
  rr(ctx, 1082, 240, 52, 22, 5); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.chairStroke; ctx.lineWidth = 1.5;
  rr(ctx, 1086, 218, 44, 36, 6); ctx.stroke();
  rr(ctx, 1082, 240, 52, 22, 5); ctx.stroke();
  ctx.fillStyle = p.chairFill;
  ctx.fillRect(1080, 236, 6, 20);
  ctx.fillRect(1114, 236, 6, 20);
  ctx.strokeStyle = p.chairStroke; ctx.lineWidth = 2;
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(1108, 265);
    ctx.lineTo(1108 + Math.cos(ang) * 16, 265 + Math.sin(ang) * 10);
    ctx.stroke();
  }

  // ── Side table + lamp ─────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 6);
  ctx.fillStyle = p.deskMid;
  rr(ctx, 935, 235, 40, 35, 3); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = p.deskEdge; ctx.lineWidth = 1;
  rr(ctx, 935, 235, 40, 35, 3); ctx.stroke();
  ctx.fillStyle = p.deskDark;
  ctx.fillRect(953, 218, 4, 17);
  ctx.fillStyle = p.mugFill;
  rr(ctx, 945, 208, 22, 14, 3); ctx.fill();
  ctx.fillStyle = p.mugFill;
  rr(ctx, 948, 248, 12, 16, 2); ctx.fill();

  // ── Corner plant (mirrored) ───────────────────────────────────────────────────
  shadow(ctx, p.shadow, 8);
  ctx.fillStyle = p.plantPot;
  rr(ctx, 918, 240, 28, 28, 3); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.plantLeaf;
  ctx.beginPath(); ctx.ellipse(930, 225, 20, 10, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(922, 218, 16, 8, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(940, 222, 12, 7, -0.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.plantLeaf2;
  ctx.beginPath(); ctx.ellipse(928, 230, 10, 5, 0.2, 0, Math.PI * 2); ctx.fill();

  // ── Window (top wall, mirrored) ───────────────────────────────────────────────
  ctx.fillStyle = p.glassBlue;
  rr(ctx, 984, 7, 130, 22, 3); ctx.fill();
  ctx.strokeStyle = p.wallBorder; ctx.lineWidth = 1;
  rr(ctx, 984, 7, 130, 22, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1049, 7); ctx.lineTo(1049, 29); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(984, 18); ctx.lineTo(1114, 18); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.5;
  for (let bx = 988; bx < 1112; bx += 8) {
    ctx.beginPath(); ctx.moveTo(bx, 7); ctx.lineTo(bx, 29); ctx.stroke();
  }
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

  // Outer 1-px black border
  ctx.fillStyle = "#000000";
  ctx.fillRect(nx - (nw >> 1) - 2, ny - 7, nw + 4, 14);
  // Background
  ctx.fillStyle = isMe ? "#201870" : "#180C28";
  ctx.fillRect(nx - (nw >> 1) - 1, ny - 6, nw + 2, 12);
  // Bright pixel border
  ctx.fillStyle = isMe ? "#8878F8" : "#605878";
  ctx.fillRect(nx - (nw >> 1) - 1, ny - 6, nw + 2, 1);
  ctx.fillRect(nx - (nw >> 1) - 1, ny + 5, nw + 2, 1);
  ctx.fillRect(nx - (nw >> 1) - 1, ny - 5, 1, 10);
  ctx.fillRect(nx + (nw >> 1) + 1, ny - 5, 1, 10);
  // Name text
  ctx.fillStyle = "#F8F8F8";
  ctx.fillText(firstName, nx, ny);

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
    drawNature(ctx, p);
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
