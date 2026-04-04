import { useEffect, useRef, useCallback } from "react";
import { Room, Position2D, UserStatus, User } from "@lifescale/shared";
import {
  CANVAS_W, CANVAS_H, ZONES, DOOR,
  PRIVATE_OFFICE_ZONE, detectZone, pctToPx, pxToPct,
} from "../zones";

const AVATAR_R = 20;
const SPEED = 260;

// Interpolation smoothing factor (higher = snappier, lower = silkier)
const LERP_SPEED = 12; // reaches target in ~1/LERP_SPEED seconds

const STATUS_COLORS: Record<UserStatus, string> = {
  available:   "#3dffa0",
  "deep-work": "#ff6464",
  "on-a-call": "#ffbe32",
};

// ─── Theme palettes ────────────────────────────────────────────────────────────
function palette(isDark: boolean) {
  return isDark ? {
    bg:           "#0d0d1a",
    floor:        "#0f0f1e",
    grid:         "rgba(255,255,255,0.025)",
    wallStroke:   0.8,
    avatarFill:   "#252538",
    avatarMeFill: "#6c63ff",
    label:        "rgba(255,255,255,0.85)",
    labelMuted:   "rgba(255,255,255,0.5)",
    indicator:    "rgba(10,10,22,0.82)",
    indicatorTxt: "#e8e8f4",
    furniture:    "rgba(255,255,255,0.12)",
    shadow:       "rgba(0,0,0,0.5)",
    doorFill:     "rgba(108,99,255,0.55)",
    doorText:     "rgba(108,99,255,0.9)",
  } : {
    bg:           "#dcdcf0",
    floor:        "#e4e4f5",
    grid:         "rgba(0,0,0,0.04)",
    wallStroke:   1,
    avatarFill:   "#8888bb",
    avatarMeFill: "#5b52ee",
    label:        "rgba(14,14,40,0.9)",
    labelMuted:   "rgba(14,14,40,0.55)",
    indicator:    "rgba(200,200,230,0.88)",
    indicatorTxt: "#14143a",
    furniture:    "rgba(0,0,0,0.1)",
    shadow:       "rgba(0,0,0,0.15)",
    doorFill:     "rgba(91,82,238,0.5)",
    doorText:     "rgba(91,82,238,0.9)",
  };
}

// ─── Drawing helpers ───────────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, p: ReturnType<typeof palette>) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle dot grid
  ctx.fillStyle = p.grid;
  const step = 40;
  for (let x = step; x < CANVAS_W; x += step) {
    for (let y = step; y < CANVAS_H; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawZones(ctx: CanvasRenderingContext2D, doorClosed: boolean, p: ReturnType<typeof palette>) {
  for (const z of ZONES) {
    // Room floor fill
    ctx.fillStyle = z.fill;
    ctx.fillRect(z.x, z.y, z.w, z.h);

    // Room label — large semi-transparent floor text, drawn before furniture
    ctx.font = "bold 15px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(z.name.toUpperCase(), z.x + z.w / 2, z.y + z.h - 18);

    // Walls
    ctx.strokeStyle = z.border;
    ctx.lineWidth = 2;

    if (z.id === "private-office") {
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      ctx.moveTo(wallX, y); ctx.lineTo(wallX, DOOR.y);
      ctx.moveTo(wallX, DOOR.y + DOOR.h); ctx.lineTo(wallX, y + h);
      ctx.moveTo(x + w, y + h); ctx.lineTo(x, y + h);
      ctx.moveTo(x, y + h); ctx.lineTo(x, y);
      ctx.stroke();
      drawDoor(ctx, doorClosed, p);
    } else {
      ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    }
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, closed: boolean, p: ReturnType<typeof palette>) {
  const { y, h } = DOOR;
  const wallX = PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w;

  if (closed) {
    ctx.fillStyle = p.doorFill;
    ctx.beginPath();
    ctx.roundRect(wallX - 12, y, 12, h, 2);
    ctx.fill();
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔒", wallX - 6, y + h / 2);
  } else {
    ctx.strokeStyle = p.doorFill;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(wallX, y);
    ctx.lineTo(wallX - 16, y + h * 0.65);
    ctx.stroke();
  }

  ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.fillStyle = p.doorText;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(closed ? "Open" : "Close", wallX + 6, y + h / 2);

  void DOOR.x; void DOOR.w;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawFurniture(ctx: CanvasRenderingContext2D, p: ReturnType<typeof palette>) {
  const isDark = p.bg === "#0d0d1a";

  // ── Private Office (0,0 → 300,280) ──────────────────────────────────────────

  // Floor rug
  ctx.fillStyle = isDark ? "rgba(108,99,255,0.12)" : "rgba(108,99,255,0.1)";
  roundRect(ctx, 14, 60, 268, 206, 6); ctx.fill();

  // Bookshelf (left wall)
  ctx.fillStyle = isDark ? "rgba(180,160,120,0.25)" : "rgba(140,120,80,0.3)";
  roundRect(ctx, 8, 10, 30, 180, 3); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(200,180,140,0.4)" : "rgba(140,110,60,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    ctx.strokeRect(10, 14 + i * 24, 26, 20);
  }
  // Book spines (colors)
  const bookColors = ["#ff6464","#6c63ff","#3dffa0","#ffbe32","#06b6d4","#a855f7","#ff8c42"];
  bookColors.forEach((c, i) => {
    ctx.fillStyle = c + (isDark ? "99" : "bb");
    ctx.fillRect(11, 15 + i * 24, 6, 18);
    ctx.fillStyle = c + (isDark ? "66" : "88");
    ctx.fillRect(19, 15 + i * 24, 5, 18);
  });

  // Desk (L-shape)
  ctx.fillStyle = isDark ? "rgba(160,140,100,0.3)" : "rgba(180,155,110,0.4)";
  roundRect(ctx, 55, 140, 180, 55, 4); ctx.fill();
  roundRect(ctx, 55, 180, 60, 70, 4); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(200,180,140,0.35)" : "rgba(160,130,80,0.5)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 55, 140, 180, 55, 4); ctx.stroke();

  // Monitor on desk
  ctx.fillStyle = isDark ? "rgba(30,40,80,0.9)" : "rgba(20,30,60,0.8)";
  roundRect(ctx, 100, 145, 80, 48, 3); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(80,120,255,0.6)" : "rgba(60,100,220,0.5)";
  roundRect(ctx, 103, 148, 74, 38, 2); ctx.fill();
  // Screen glow
  ctx.fillStyle = isDark ? "rgba(80,120,255,0.15)" : "rgba(60,100,220,0.1)";
  roundRect(ctx, 95, 142, 90, 56, 4); ctx.fill();
  // Monitor stand
  ctx.fillStyle = isDark ? "rgba(180,170,150,0.3)" : "rgba(140,130,110,0.4)";
  ctx.fillRect(135, 193, 10, 6);
  ctx.fillRect(128, 197, 24, 3);

  // Chair (arc)
  ctx.strokeStyle = isDark ? "rgba(160,150,200,0.5)" : "rgba(100,90,160,0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(80, 228, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = isDark ? "rgba(108,99,255,0.2)" : "rgba(108,99,255,0.15)";
  ctx.fill();

  // Plant (corner)
  ctx.fillStyle = isDark ? "rgba(30,80,40,0.7)" : "rgba(20,100,40,0.5)";
  roundRect(ctx, 258, 228, 22, 24, 3); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(40,200,80,0.7)" : "rgba(30,180,70,0.6)";
  ctx.beginPath(); ctx.arc(269, 220, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(60,220,100,0.5)" : "rgba(50,200,90,0.4)";
  ctx.beginPath(); ctx.arc(258, 215, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(280, 218, 10, 0, Math.PI * 2); ctx.fill();

  // Window (top wall)
  ctx.fillStyle = isDark ? "rgba(100,160,255,0.15)" : "rgba(150,200,255,0.3)";
  roundRect(ctx, 90, 2, 120, 18, 2); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(100,160,255,0.4)" : "rgba(80,140,240,0.5)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 90, 2, 120, 18, 2); ctx.stroke();
  ctx.strokeStyle = isDark ? "rgba(100,160,255,0.25)" : "rgba(80,140,240,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(150, 2); ctx.lineTo(150, 20); ctx.stroke();

  // ── War Room (440,240 → 760,550) ─────────────────────────────────────────────

  // Rug under table
  ctx.fillStyle = isDark ? "rgba(255,80,50,0.1)" : "rgba(255,80,50,0.08)";
  roundRect(ctx, 460, 268, 280, 254, 8); ctx.fill();

  // Conference table
  ctx.fillStyle = isDark ? "rgba(160,100,70,0.45)" : "rgba(180,120,80,0.5)";
  roundRect(ctx, 490, 300, 220, 150, 8); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(220,150,100,0.5)" : "rgba(180,120,60,0.7)";
  ctx.lineWidth = 2;
  roundRect(ctx, 490, 300, 220, 150, 8); ctx.stroke();
  // Table surface reflection
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.15)";
  roundRect(ctx, 498, 306, 100, 60, 4); ctx.fill();

  // Chairs around table
  const chairColor = isDark ? "rgba(255,80,50,0.3)" : "rgba(255,80,50,0.25)";
  ctx.fillStyle = chairColor;
  ctx.strokeStyle = isDark ? "rgba(255,110,80,0.5)" : "rgba(220,70,40,0.6)";
  ctx.lineWidth = 1.5;
  // Top chairs
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, 506 + i * 72, 274, 44, 22, 4); ctx.fill(); ctx.stroke();
  }
  // Bottom chairs
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, 506 + i * 72, 456, 44, 22, 4); ctx.fill(); ctx.stroke();
  }
  // Left chairs
  roundRect(ctx, 458, 316, 28, 44, 4); ctx.fill(); ctx.stroke();
  roundRect(ctx, 458, 392, 28, 44, 4); ctx.fill(); ctx.stroke();
  // Right chairs
  roundRect(ctx, 714, 316, 28, 44, 4); ctx.fill(); ctx.stroke();
  roundRect(ctx, 714, 392, 28, 44, 4); ctx.fill(); ctx.stroke();

  // Whiteboard (left wall of war room)
  ctx.fillStyle = isDark ? "rgba(240,240,255,0.12)" : "rgba(255,255,255,0.6)";
  roundRect(ctx, 444, 256, 20, 100, 2); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(200,200,255,0.3)" : "rgba(160,160,200,0.5)";
  ctx.lineWidth = 1;
  roundRect(ctx, 444, 256, 20, 100, 2); ctx.stroke();
  // Marker lines on whiteboard
  ctx.strokeStyle = isDark ? "rgba(100,180,255,0.6)" : "rgba(60,100,200,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(447, 275); ctx.lineTo(461, 275); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(447, 285); ctx.lineTo(458, 285); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(447, 295); ctx.lineTo(462, 295); ctx.stroke();

  // Projector screen (right wall)
  ctx.fillStyle = isDark ? "rgba(230,230,255,0.1)" : "rgba(255,255,255,0.5)";
  roundRect(ctx, 756, 260, 18, 80, 2); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(200,200,255,0.3)" : "rgba(160,160,200,0.5)";
  ctx.lineWidth = 1;
  roundRect(ctx, 756, 260, 18, 80, 2); ctx.stroke();

  // ── Lounge (900,560 → 1200,800) ─────────────────────────────────────────────

  // Rug
  ctx.fillStyle = isDark ? "rgba(30,210,140,0.12)" : "rgba(30,180,120,0.1)";
  roundRect(ctx, 910, 568, 282, 224, 10); ctx.fill();

  // L-shaped sofa
  ctx.fillStyle = isDark ? "rgba(40,160,100,0.4)" : "rgba(30,140,90,0.4)";
  ctx.strokeStyle = isDark ? "rgba(50,210,140,0.55)" : "rgba(30,170,100,0.65)";
  ctx.lineWidth = 2;
  // Main sofa body
  roundRect(ctx, 912, 572, 160, 50, 6); ctx.fill(); ctx.stroke();
  // Side sofa
  roundRect(ctx, 1040, 572, 50, 110, 6); ctx.fill(); ctx.stroke();
  // Cushions
  ctx.fillStyle = isDark ? "rgba(60,220,150,0.25)" : "rgba(40,190,120,0.25)";
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, 918 + i * 50, 578, 42, 34, 4); ctx.fill();
  }
  roundRect(ctx, 1046, 578, 36, 46, 4); ctx.fill();

  // Coffee table
  ctx.fillStyle = isDark ? "rgba(160,140,100,0.4)" : "rgba(180,155,110,0.45)";
  roundRect(ctx, 930, 638, 100, 60, 5); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(200,180,140,0.4)" : "rgba(160,130,80,0.55)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 930, 638, 100, 60, 5); ctx.stroke();
  // Items on coffee table
  ctx.fillStyle = isDark ? "rgba(255,190,50,0.5)" : "rgba(240,170,30,0.6)";
  ctx.beginPath(); ctx.arc(960, 668, 8, 0, Math.PI * 2); ctx.fill(); // mug
  ctx.fillStyle = isDark ? "rgba(200,200,220,0.3)" : "rgba(180,180,210,0.4)";
  roundRect(ctx, 978, 660, 28, 18, 2); ctx.fill(); // book/tablet

  // TV on wall
  ctx.fillStyle = isDark ? "rgba(20,25,50,0.9)" : "rgba(15,20,40,0.85)";
  roundRect(ctx, 906, 562, 90, 52, 4); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(40,80,180,0.5)" : "rgba(30,60,150,0.4)";
  roundRect(ctx, 909, 565, 84, 44, 3); ctx.fill();
  // TV screen glow
  ctx.fillStyle = isDark ? "rgba(60,100,255,0.12)" : "rgba(40,80,200,0.08)";
  roundRect(ctx, 904, 560, 96, 58, 5); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(80,120,255,0.3)" : "rgba(60,90,200,0.4)";
  ctx.lineWidth = 1;
  roundRect(ctx, 906, 562, 90, 52, 4); ctx.stroke();

  // Plant (lounge corner)
  ctx.fillStyle = isDark ? "rgba(30,80,40,0.7)" : "rgba(20,100,40,0.5)";
  roundRect(ctx, 1164, 728, 24, 30, 3); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(40,200,80,0.65)" : "rgba(30,180,70,0.55)";
  ctx.beginPath(); ctx.arc(1176, 720, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(60,220,100,0.45)" : "rgba(50,200,90,0.35)";
  ctx.beginPath(); ctx.arc(1162, 715, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1190, 717, 12, 0, Math.PI * 2); ctx.fill();

  // ── Open Floor desks (scattered) ─────────────────────────────────────────────
  const openDesks = [
    { x: 340, y: 40 },
    { x: 340, y: 140 },
    { x: 820, y: 40 },
    { x: 820, y: 140 },
    { x: 100, y: 380 },
    { x: 200, y: 500 },
    { x: 600, y: 620 },
    { x: 700, y: 720 },
  ];

  for (const d of openDesks) {
    ctx.fillStyle = isDark ? "rgba(160,140,100,0.2)" : "rgba(180,155,110,0.25)";
    roundRect(ctx, d.x, d.y, 80, 45, 3); ctx.fill();
    ctx.strokeStyle = isDark ? "rgba(200,180,140,0.2)" : "rgba(160,130,80,0.3)";
    ctx.lineWidth = 1;
    roundRect(ctx, d.x, d.y, 80, 45, 3); ctx.stroke();
    // Monitor
    ctx.fillStyle = isDark ? "rgba(30,40,80,0.7)" : "rgba(20,30,60,0.6)";
    roundRect(ctx, d.x + 20, d.y + 4, 36, 24, 2); ctx.fill();
    ctx.fillStyle = isDark ? "rgba(60,100,200,0.4)" : "rgba(40,80,180,0.3)";
    roundRect(ctx, d.x + 22, d.y + 6, 32, 20, 1); ctx.fill();
  }

  // Water cooler
  ctx.fillStyle = isDark ? "rgba(80,160,220,0.35)" : "rgba(60,140,200,0.35)";
  roundRect(ctx, 414, 40, 20, 40, 4); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(120,200,255,0.4)" : "rgba(80,160,220,0.45)";
  roundRect(ctx, 415, 42, 18, 20, 4); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(100,180,240,0.4)" : "rgba(60,140,200,0.5)";
  ctx.lineWidth = 1;
  roundRect(ctx, 414, 40, 20, 40, 4); ctx.stroke();
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  user: User,
  isMe: boolean,
  p: ReturnType<typeof palette>,
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

    // Second outer ring (fainter, larger)
    ctx.beginPath();
    ctx.arc(x, y, ringR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(61, 255, 160, ${pulse * 0.35})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Shadow
  ctx.shadowColor = p.shadow;
  ctx.shadowBlur = isMe ? 14 : 8;

  // Outer glow ring (me = white, others = status color)
  ctx.beginPath();
  ctx.arc(x, y, AVATAR_R + 3, 0, Math.PI * 2);
  ctx.strokeStyle = isMe ? "rgba(255,255,255,0.5)" : `${statusColor}66`;
  ctx.lineWidth = isMe ? 2.5 : 1.5;
  ctx.stroke();

  ctx.shadowBlur = 0;

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

function drawZoneIndicator(ctx: CanvasRenderingContext2D, zoneName: string, p: ReturnType<typeof palette>) {
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
  // Interpolated positions for remote users: userId → {x, y} in virtual px
  const interpRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  useEffect(() => {
    roomRef.current = room;
    // Seed any new users into the interpolation map at their current position
    for (const user of room.users) {
      if (!interpRef.current.has(user.id)) {
        interpRef.current.set(user.id, pctToPx(user.position));
      }
    }
    // Remove users who left
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

  // Cache palette to avoid recreating every frame
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

    // Sync canvas buffer to its CSS display size so it's always crisp and full-screen
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw > 0 && ch > 0 && (canvas.width !== cw || canvas.height !== ch)) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // Scale all drawing from the 1200×800 virtual space to the actual canvas size
    const sx = canvas.width / CANVAS_W;
    const sy = canvas.height / CANVAS_H;
    ctx.save();
    ctx.scale(sx, sy);

    const p = paletteRef.current;
    drawBackground(ctx, p);
    drawZones(ctx, doorClosedRef.current, p);
    drawFurniture(ctx, p);

    // Frame-rate independent lerp factor
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
      const isSpeaking = speaking.has(user.name);
      drawAvatar(ctx, ix, iy, user, false, p, isSpeaking, time);
    }

    const meUser = roomRef.current.users.find((u) => u.id === myId);
    const iAmSpeaking = meUser ? speaking.has(meUser.name) : false;
    if (meUser) drawAvatar(ctx, x, y, meUser, true, p, iAmSpeaking, time);

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
