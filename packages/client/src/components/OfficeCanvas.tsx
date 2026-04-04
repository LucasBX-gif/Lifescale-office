import { useEffect, useRef, useCallback } from "react";
import { Room, Position2D, UserStatus, User } from "@lifescale/shared";
import {
  CANVAS_W, CANVAS_H, ZONES, DOOR,
  PRIVATE_OFFICE_ZONE, detectZone, pctToPx, pxToPct,
} from "../zones";

const AVATAR_R = 20;
const SPEED = 200;

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

    // Room label
    ctx.font = "bold 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = z.border;
    ctx.fillText(z.name.toUpperCase(), z.x + 12, z.y + 12);

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

function drawFurniture(ctx: CanvasRenderingContext2D, p: ReturnType<typeof palette>) {
  ctx.strokeStyle = p.furniture;
  ctx.lineWidth = 1.5;

  // Private Office — desk + monitor
  ctx.strokeRect(60, 160, 110, 70);
  ctx.strokeRect(90, 165, 50, 35); // monitor
  ctx.strokeRect(145, 185, 14, 40); // chair back

  // War Room — conference table + chairs
  ctx.strokeStyle = p.furniture;
  ctx.strokeRect(490, 295, 220, 100);
  for (let i = 0; i < 3; i++) {
    ctx.strokeRect(505 + i * 70, 275, 40, 16); // chairs top
    ctx.strokeRect(505 + i * 70, 399, 40, 16); // chairs bottom
  }
  ctx.strokeRect(465, 310, 20, 70); // chair left
  ctx.strokeRect(715, 310, 20, 70); // chair right

  // Lounge — two sofas + coffee table
  ctx.strokeRect(912, 572, 80, 36);  // sofa 1
  ctx.strokeRect(1008, 572, 80, 36); // sofa 2
  ctx.strokeRect(940, 620, 120, 28); // coffee table
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  user: User,
  isMe: boolean,
  p: ReturnType<typeof palette>
) {
  const statusColor = STATUS_COLORS[user.status];

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
}

export function OfficeCanvas({
  room, myUserId, myPosition,
  onMove, onZoneChange,
  privateOfficeDoorClosed, onDoorToggle, onKnock,
  isDark,
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
  useEffect(() => { roomRef.current = room; }, [room]);

  const myUserIdRef = useRef(myUserId);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);

  const doorClosedRef = useRef(privateOfficeDoorClosed);
  useEffect(() => { doorClosedRef.current = privateOfficeDoorClosed; }, [privateOfficeDoorClosed]);

  const isDarkRef = useRef(isDark);
  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);

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

    const p = palette(isDarkRef.current);

    drawBackground(ctx, p);
    drawZones(ctx, doorClosedRef.current, p);
    drawFurniture(ctx, p);

    const myId = myUserIdRef.current;
    for (const user of roomRef.current.users) {
      if (user.id === myId) continue;
      const { x: ux, y: uy } = pctToPx(user.position);
      drawAvatar(ctx, ux, uy, user, false, p);
    }

    const meUser = roomRef.current.users.find((u) => u.id === myId);
    if (meUser) drawAvatar(ctx, x, y, meUser, true, p);

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
