import { useEffect, useRef, useCallback } from "react";
import { Room, Position2D, UserStatus, User, OfficeAssignment } from "@lifescale/shared";
import {
  CANVAS_W, CANVAS_H, ZONES, DOOR, DOOR_2,
  PRIVATE_OFFICE_ZONE, PRIVATE_OFFICE_2_ZONE, detectZone, pctToPx, pxToPct,
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

// ─── Per-style office floor ───────────────────────────────────────────────────
function drawOfficeFloor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: number, p: P) {
  const isDark = p.bg === "#0a0a14";
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
    default: return { border: "rgba(140,130,255,0.85)", rug: "rgba(108,99,255,0.08)" };
  }
}

// ─── Zones — walls & labels ───────────────────────────────────────────────────
function drawZones(
  ctx: CanvasRenderingContext2D,
  doorClosed: boolean,
  p: P,
  offices: [OfficeAssignment, OfficeAssignment]
) {
  const WT = 7;

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
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = p.zoneLabel;
    ctx.fillText(label, z.x + z.w / 2, z.y + z.h - 16);

    // Locked red tint overlay
    const isLocked =
      (z.id === "private-office" && offices[0].locked) ||
      (z.id === "private-office-2" && offices[1].locked);
    if (isLocked) {
      ctx.fillStyle = "rgba(255,40,40,0.07)";
      ctx.fillRect(z.x, z.y, z.w, z.h);
    }

    // Thick walls
    ctx.fillStyle = p.wallFill;
    if (z.id === "private-office") {
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w;
      ctx.fillRect(x, y, w + WT, WT);
      ctx.fillRect(x, y, WT, h);
      ctx.fillRect(x, y + h, w + WT, WT);
      // Right wall with door gap (or solid if locked)
      if (isLocked) {
        ctx.fillRect(wallX, y, WT, h);
      } else {
        ctx.fillRect(wallX, y, WT, DOOR.y - y);
        ctx.fillRect(wallX, DOOR.y + DOOR.h, WT, y + h - (DOOR.y + DOOR.h));
        drawDoor(ctx, doorClosed, p, false);
      }
    } else if (z.id === "private-office-2") {
      const { x, y, w, h } = PRIVATE_OFFICE_2_ZONE;
      const wallX = x; // door is on LEFT wall
      ctx.fillRect(x, y, w, WT);                 // top
      ctx.fillRect(x, y, WT, h);                 // left placeholder (canvas edge at x=900)
      ctx.fillRect(x + w, y, WT, h + WT);        // right (canvas edge)
      ctx.fillRect(x, y + h, w + WT, WT);        // bottom
      // Left wall with door gap (or solid if locked)
      if (isLocked) {
        ctx.fillRect(wallX, y, WT, h);
      } else {
        ctx.fillRect(wallX, y, WT, DOOR_2.y - y);
        ctx.fillRect(wallX, DOOR_2.y + DOOR_2.h, WT, y + h - (DOOR_2.y + DOOR_2.h));
        drawDoor(ctx, doorClosed, p, true);
      }
    } else {
      ctx.fillRect(z.x, z.y, z.w, WT);
      ctx.fillRect(z.x, z.y + z.h, z.w, WT);
      ctx.fillRect(z.x, z.y, WT, z.h);
      ctx.fillRect(z.x + z.w, z.y, WT, z.h + WT);
    }

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

// ─── Door ─────────────────────────────────────────────────────────────────────
function drawDoor(ctx: CanvasRenderingContext2D, closed: boolean, p: P, isOffice2: boolean) {
  const door = isOffice2 ? DOOR_2 : DOOR;
  const { y, h } = door;
  const wallX = isOffice2
    ? PRIVATE_OFFICE_2_ZONE.x          // left wall of office 2
    : PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w; // right wall of office 1

  if (closed) {
    ctx.fillStyle = p.doorFill;
    if (isOffice2) {
      rr(ctx, wallX, y, 10, h, 2); ctx.fill();
      ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔒", wallX + 5, y + h / 2);
    } else {
      rr(ctx, wallX - 10, y, 10, h, 2); ctx.fill();
      ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔒", wallX - 5, y + h / 2);
    }
  } else {
    ctx.strokeStyle = p.doorFill;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isOffice2) {
      ctx.moveTo(wallX, y); ctx.lineTo(wallX + 18, y + h * 0.65);
    } else {
      ctx.moveTo(wallX, y); ctx.lineTo(wallX - 18, y + h * 0.65);
    }
    ctx.stroke();
  }

  ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.fillStyle = p.doorText;
  ctx.textBaseline = "middle";
  if (isOffice2) {
    ctx.textAlign = "right";
    ctx.fillText(closed ? "Open" : "Close", wallX - 4, y + h / 2);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(closed ? "Open" : "Close", wallX + 10, y + h / 2);
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

  // ── Monitor (mirrored) ────────────────────────────────────────────────────────
  shadow(ctx, p.shadow, 12);
  ctx.fillStyle = p.screenFill;
  rr(ctx, 1014, 150, 86, 50, 3); ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = p.screenGlowOut;
  rr(ctx, 1009, 145, 96, 60, 5); ctx.fill();
  ctx.fillStyle = p.screenGlow;
  rr(ctx, 1018, 153, 78, 42, 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  rr(ctx, 1020, 155, 50, 20, 1); ctx.fill();
  rr(ctx, 1020, 178, 30, 8, 1); ctx.fill();
  ctx.fillStyle = p.deskMid;
  ctx.fillRect(1054, 200, 9, 8);
  ctx.fillRect(1046, 207, 26, 4);

  // Keyboard + mouse (mirrored)
  ctx.fillStyle = p.chairFill;
  rr(ctx, 984, 170, 56, 18, 2); ctx.fill();
  rr(ctx, 964, 172, 14, 20, 5); ctx.fill();

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

function drawCanvasBtn(
  ctx: CanvasRenderingContext2D,
  btn: { x: number; y: number; w: number; h: number },
  label: string,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 6); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);
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
    const offs = officesRef.current;
    drawBackground(ctx, p);
    drawZones(ctx, doorClosedRef.current, p, offs);
    drawLights(ctx, p);
    drawFurniture(ctx, p, [offs[0].style ?? 0, offs[1].style ?? 0]);

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

    const d1 = Math.sqrt((x - DOOR1_CENTER.x) ** 2 + (y - DOOR1_CENTER.y) ** 2);
    const d2 = Math.sqrt((x - DOOR2_CENTER.x) ** 2 + (y - DOOR2_CENTER.y) ** 2);

    showLock1Ref.current = false;
    showLock2Ref.current = false;

    // Knock buttons (non-owner outside a locked door)
    const sK1 = myIdx !== 0 && offs[0].locked && zone !== "Private Office" && d1 <= BTN_RANGE;
    const sK2 = myIdx !== 1 && offs[1].locked && zone !== "Private Office 2" && d2 <= BTN_RANGE;
    showKnock1Ref.current = sK1;
    showKnock2Ref.current = sK2;
    if (sK1) drawCanvasBtn(ctx, KNOCK_BTN_1, "🚪 Knock", "rgba(255,140,0,0.9)");
    if (sK2) drawCanvasBtn(ctx, KNOCK_BTN_2, "🚪 Knock", "rgba(255,140,0,0.9)");

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
