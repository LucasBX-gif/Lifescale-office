import { useEffect, useRef, useCallback } from "react";
import { Room, Position2D, UserStatus, User } from "@lifescale/shared";
import {
  CANVAS_W,
  CANVAS_H,
  ZONES,
  DOOR,
  PRIVATE_OFFICE_ZONE,
  detectZone,
  pctToPx,
  pxToPct,
} from "../zones";

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATAR_R = 18;
const SPEED = 200; // px / second

const STATUS_COLORS: Record<UserStatus, string> = {
  available:   "#3dffa0",
  "deep-work": "#ff6464",
  "on-a-call": "#ffbe32",
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────
function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const step = 60;
  for (let x = 0; x <= CANVAS_W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
}

function drawZones(ctx: CanvasRenderingContext2D, doorClosed: boolean) {
  for (const z of ZONES) {
    // zone fill
    ctx.fillStyle = z.fill;
    ctx.fillRect(z.x, z.y, z.w, z.h);

    // zone label
    ctx.fillStyle = z.border;
    ctx.font = "bold 13px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(z.name, z.x + 10, z.y + 10);

    // ── Walls ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = z.border;
    ctx.lineWidth = 2;

    if (z.id === "private-office") {
      // Draw three full walls + right wall with a door gap
      const { x, y, w, h } = PRIVATE_OFFICE_ZONE;
      const wallX = x + w; // x = 300

      ctx.beginPath();
      // top
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      // right wall upper segment (above door)
      ctx.moveTo(wallX, y); ctx.lineTo(wallX, DOOR.y);
      // right wall lower segment (below door)
      ctx.moveTo(wallX, DOOR.y + DOOR.h); ctx.lineTo(wallX, y + h);
      // bottom
      ctx.moveTo(x + w, y + h); ctx.lineTo(x, y + h);
      // left
      ctx.moveTo(x, y + h); ctx.lineTo(x, y);
      ctx.stroke();

      // ── Door element ────────────────────────────────────────────────────
      drawDoor(ctx, doorClosed);
    } else {
      ctx.strokeRect(z.x + 1, z.y + 1, z.w - 2, z.h - 2);
    }
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, closed: boolean) {
  const { x, y, w, h } = DOOR;
  const wallX = PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w; // 300

  if (closed) {
    // Solid door panel — blocks the gap
    ctx.fillStyle = "rgba(108, 99, 255, 0.6)";
    ctx.fillRect(wallX - 10, y, 10, h);
    // lock icon
    ctx.fillStyle = "rgba(108, 99, 255, 1)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔒", wallX - 5, y + h / 2);
  } else {
    // Open door — a slightly ajar panel drawn into the room
    ctx.strokeStyle = "rgba(108, 99, 255, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wallX, y);
    ctx.lineTo(wallX - 14, y + h * 0.6); // swung open inward
    ctx.stroke();
  }

  // Clickable affordance label (always visible)
  ctx.font = "10px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(108, 99, 255, 0.85)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(closed ? "Open" : "Close", wallX + 6, y + h / 2);

  // invisible hit zone outline (dev aid — remove if too noisy)
  // ctx.strokeStyle = "rgba(255,0,0,0.3)"; ctx.strokeRect(x, y, w, h);
  void x; void w; // suppress unused-var lint
}

function drawFurniture(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(108,99,255,0.45)";
  ctx.strokeRect(200, 190, 90, 60);
  ctx.strokeRect(260, 195, 20, 50);

  ctx.strokeStyle = "rgba(255,100,80,0.4)";
  ctx.strokeRect(490, 320, 220, 90);

  ctx.strokeStyle = "rgba(50,200,140,0.4)";
  ctx.strokeRect(910, 600, 80, 40);
  ctx.strokeRect(1010, 600, 80, 40);
  ctx.strokeRect(935, 650, 130, 30);
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  user: User,
  isMe: boolean
) {
  const statusColor = STATUS_COLORS[user.status];

  ctx.beginPath();
  ctx.arc(x, y, AVATAR_R + 4, 0, Math.PI * 2);
  ctx.fillStyle = isMe ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, AVATAR_R + 2, 0, Math.PI * 2);
  ctx.strokeStyle = isMe ? "#ffffff" : statusColor;
  ctx.lineWidth = isMe ? 2.5 : 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, AVATAR_R, 0, Math.PI * 2);
  ctx.fillStyle = isMe ? "#6c63ff" : "#2e2e42";
  ctx.fill();

  const ini = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${AVATAR_R * 0.7}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ini, x, y + 1);

  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.fillStyle = isMe ? "#ffffff" : "rgba(255,255,255,0.75)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(user.name, x, y + AVATAR_R + 5);

  if (user.isMuted) {
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("🔇", x + AVATAR_R - 2, y - AVATAR_R + 2);
  }

  ctx.beginPath();
  ctx.arc(x + AVATAR_R - 4, y + AVATAR_R - 4, 5, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.fill();
  ctx.strokeStyle = "#0f0f13";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawZoneIndicator(ctx: CanvasRenderingContext2D, zoneName: string) {
  ctx.font = "bold 13px Inter, system-ui, sans-serif";
  const text = `  ${zoneName}  `;
  const tw = ctx.measureText(text).width;
  const x = CANVAS_W - tw - 14;
  const y = 12;
  const h = 24;

  ctx.fillStyle = "rgba(15,15,19,0.75)";
  ctx.beginPath();
  ctx.roundRect(x - 4, y - 2, tw + 8, h, 6);
  ctx.fill();

  ctx.fillStyle = "#e8e8f0";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, x, y + h / 2 - 2);
}

// ─── Knock button geometry (drawn just outside the door, right side) ──────────
const KNOCK_BTN = { x: 308, y: 118, w: 72, h: 28 } as const;
const DOOR_CENTER_PX = { x: PRIVATE_OFFICE_ZONE.x + PRIVATE_OFFICE_ZONE.w, y: DOOR.y + DOOR.h / 2 };
const KNOCK_RANGE_PX = 100;

function drawKnockButton(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = KNOCK_BTN;
  ctx.fillStyle = "rgba(108, 99, 255, 0.85)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("�knock", x + w / 2, y + h / 2);
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
}

export function OfficeCanvas({
  room,
  myUserId,
  myPosition,
  onMove,
  onZoneChange,
  privateOfficeDoorClosed,
  onDoorToggle,
  onKnock,
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
  useEffect(() => { roomRef.current = room; }, [room]);

  const myUserIdRef = useRef(myUserId);
  useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]);

  const doorClosedRef = useRef(privateOfficeDoorClosed);
  useEffect(() => { doorClosedRef.current = privateOfficeDoorClosed; }, [privateOfficeDoorClosed]);

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

  // Whether to show the knock button — recomputed each frame, stored in ref for click handler
  const showKnockRef = useRef(false);

  // ── Game loop ────────────────────────────────────────────────────────────────
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

    // ── Draw ──────────────────────────────────────────────────────────────
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    ctx.fillStyle = "#0f0f13";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawGrid(ctx);
    drawZones(ctx, doorClosedRef.current);
    drawFurniture(ctx);

    const myId = myUserIdRef.current;
    for (const user of roomRef.current.users) {
      if (user.id === myId) continue;
      const { x: ux, y: uy } = pctToPx(user.position);
      drawAvatar(ctx, ux, uy, user, false);
    }

    const meUser = roomRef.current.users.find((u) => u.id === myId);
    if (meUser) drawAvatar(ctx, x, y, meUser, true);

    drawZoneIndicator(ctx, zone);

    // Knock button: visible when I'm outside the Private Office, door is closed,
    // and I'm within KNOCK_RANGE_PX of the door.
    const myZone = zone;
    const distToDoor = Math.sqrt(
      (x - DOOR_CENTER_PX.x) ** 2 + (y - DOOR_CENTER_PX.y) ** 2
    );
    const showKnock =
      doorClosedRef.current &&
      myZone !== "Private Office" &&
      distToDoor <= KNOCK_RANGE_PX;
    showKnockRef.current = showKnock;
    if (showKnock) drawKnockButton(ctx);

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
        e.preventDefault();
        keysRef.current.add(k);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key.toLowerCase());
    }
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

  // ── Canvas click → door toggle or knock ──────────────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    // Knock button hit-test (only when visible)
    if (showKnockRef.current) {
      const { x, y, w, h } = KNOCK_BTN;
      if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
        // Collect users currently in the Private Office
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

    // Door hit-test
    if (
      cx >= DOOR.x && cx <= DOOR.x + DOOR.w &&
      cy >= DOOR.y && cy <= DOOR.y + DOOR.h
    ) {
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
