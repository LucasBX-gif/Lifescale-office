import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { AccessToken } from "livekit-server-sdk";
import {
  EVENTS,
  User,
  Room,
  JoinRoomPayload,
  MovePayload,
  SetStatusPayload,
  KnockPayload,
  KnockResponsePayload,
} from "@lifescale/shared";

const PORT = process.env.PORT || 3001;
const LK_API_KEY = process.env.LIVEKIT_API_KEY!;
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET!;

// Accept the configured production origin plus any Vercel preview URL for this project.
const PRODUCTION_ORIGIN = (process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
const VERCEL_PREVIEW_RE = /^https:\/\/lifescale-office-client.*\.vercel\.app$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  if (origin === PRODUCTION_ORIGIN) return true;
  if (VERCEL_PREVIEW_RE.test(origin)) return true;
  if (origin === "http://localhost:5173") return true;
  return false;
}

const corsOriginFn = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
) => cb(null, isAllowedOrigin(origin));

const app = express();
app.use(cors({ origin: corsOriginFn, credentials: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOriginFn, methods: ["GET", "POST"], credentials: true },
});

// --- In-memory office state ---

const rooms = new Map<string, Room>([
  ["lobby",        { id: "lobby",        name: "Lobby",        users: [], privateOfficeDoorClosed: false }],
  ["open-floor",   { id: "open-floor",   name: "Open Floor",   users: [], privateOfficeDoorClosed: false }],
  ["focus-zone",   { id: "focus-zone",   name: "Focus Zone",   users: [], privateOfficeDoorClosed: false }],
  ["meeting-room-1",{ id: "meeting-room-1",name:"Meeting Room 1",users:[],privateOfficeDoorClosed: false }],
]);

const userSocketMap = new Map<string, string>(); // userId -> socketId
const socketUserMap = new Map<string, User>();   // socketId -> User

// --- REST ---

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/rooms", (_req, res) => {
  res.json(Array.from(rooms.values()));
});

/**
 * GET /token?roomId=lobby&name=Jane
 * Returns a short-lived LiveKit JWT the client uses to join the voice room.
 * The LiveKit room name mirrors our office room id so each office room
 * gets its own isolated voice channel.
 */
app.get("/token", async (req, res) => {
  const { roomId, name } = req.query as { roomId?: string; name?: string };

  if (!roomId || !name) {
    res.status(400).json({ error: "roomId and name are required" });
    return;
  }
  if (!rooms.has(roomId)) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const participantIdentity = `${name.trim()}-${uuidv4().slice(0, 6)}`;

  const token = new AccessToken(LK_API_KEY, LK_API_SECRET, {
    identity: participantIdentity,
    name: name.trim(),
    ttl: "4h",
  });

  token.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true,
  });

  res.json({
    token: await token.toJwt(),
    identity: participantIdentity,
  });
});

// --- Socket.io (position tracking) ---

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on(EVENTS.JOIN_ROOM, ({ roomId, name }: JoinRoomPayload) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const user: User = {
      id: uuidv4(),
      name,
      position: { x: 50, y: 50 },
      room: roomId,
      isMuted: false,
      isDeafened: false,
      status: "available",
    };

    userSocketMap.set(user.id, socket.id);
    socketUserMap.set(socket.id, user);
    room.users.push(user);

    socket.join(roomId);
    socket.emit(EVENTS.ROOM_STATE, room);
    socket.to(roomId).emit(EVENTS.USER_JOINED, user);

    console.log(`${name} joined room ${roomId}`);
  });

  socket.on(EVENTS.MOVE, ({ position }: MovePayload) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    user.position = position;
    io.to(user.room).emit(EVENTS.USER_MOVED, { userId: user.id, position });
  });

  socket.on(EVENTS.TOGGLE_MUTE, () => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    user.isMuted = !user.isMuted;
    io.to(user.room).emit(EVENTS.USER_UPDATED, {
      userId: user.id,
      isMuted: user.isMuted,
    });
  });

  socket.on(EVENTS.TOGGLE_DEAFEN, () => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    user.isDeafened = !user.isDeafened;
    io.to(user.room).emit(EVENTS.USER_UPDATED, {
      userId: user.id,
      isDeafened: user.isDeafened,
    });
  });

  socket.on(EVENTS.SET_STATUS, ({ status }: SetStatusPayload) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    user.status = status;
    io.to(user.room).emit(EVENTS.USER_UPDATED, { userId: user.id, status });
  });

  socket.on(EVENTS.TOGGLE_DOOR, () => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    const room = rooms.get(user.room);
    if (!room) return;
    room.privateOfficeDoorClosed = !room.privateOfficeDoorClosed;
    io.to(user.room).emit(EVENTS.DOOR_CHANGED, { closed: room.privateOfficeDoorClosed });
  });

  // Route a knock to specific users by ID (client resolves who's in the zone)
  socket.on(EVENTS.KNOCK, ({ targetUserIds }: KnockPayload) => {
    const knocker = socketUserMap.get(socket.id);
    if (!knocker) return;
    for (const targetId of targetUserIds) {
      const targetSocketId = userSocketMap.get(targetId);
      if (targetSocketId) {
        io.to(targetSocketId).emit(EVENTS.KNOCKED, {
          knockerId: knocker.id,
          knockerName: knocker.name,
        });
      }
    }
  });

  // Accept → server opens the door and tells the knocker; Ignore → just tell the knocker
  socket.on(EVENTS.KNOCK_RESPONSE, ({ knockerId, accepted }: KnockResponsePayload) => {
    const responder = socketUserMap.get(socket.id);
    if (!responder) return;

    // Notify the knocker of the outcome
    const knockerSocketId = userSocketMap.get(knockerId);
    if (knockerSocketId) {
      io.to(knockerSocketId).emit(EVENTS.KNOCK_ANSWERED, {
        accepted,
        responderName: responder.name,
      });
    }

    // Accept → open the door for the whole room
    if (accepted) {
      const room = rooms.get(responder.room);
      if (room) {
        room.privateOfficeDoorClosed = false;
        io.to(responder.room).emit(EVENTS.DOOR_CHANGED, { closed: false });
      }
    }
  });

  socket.on(EVENTS.LEAVE_ROOM, () => handleLeave(socket.id));
  socket.on("disconnect", () => {
    handleLeave(socket.id);
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

function handleLeave(socketId: string) {
  const user = socketUserMap.get(socketId);
  if (!user) return;
  const room = rooms.get(user.room);
  if (room) {
    room.users = room.users.filter((u) => u.id !== user.id);
    io.to(user.room).emit(EVENTS.USER_LEFT, { userId: user.id });
  }
  userSocketMap.delete(user.id);
  socketUserMap.delete(socketId);
}

httpServer.listen(PORT, () => {
  console.log(`Lifescale Office server running on http://localhost:${PORT}`);
});
