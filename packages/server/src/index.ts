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
  OfficeAssignment,
  JoinRoomPayload,
  MovePayload,
  SetStatusPayload,
  KnockPayload,
  KnockResponsePayload,
  LockOfficePayload,
} from "@lifescale/shared";

const PORT = process.env.PORT || 3001;
const LK_API_KEY = process.env.LIVEKIT_API_KEY!;
const LK_API_SECRET = process.env.LIVEKIT_API_SECRET!;

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

function emptyOffice(): OfficeAssignment {
  return { ownerId: "", ownerName: "", locked: false };
}

const rooms = new Map<string, Room>();

function getOrCreateRoom(roomId: string, roomName?: string): Room {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      name: roomName || roomId,
      users: [],
      privateOfficeDoorClosed: false,
      offices: [emptyOffice(), emptyOffice()],
    });
  }
  return rooms.get(roomId)!;
}

const userSocketMap = new Map<string, string>();
const socketUserMap = new Map<string, User>();

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/rooms", (_req, res) => {
  res.json(Array.from(rooms.values()).map((r) => ({ id: r.id, name: r.name, userCount: r.users.length })));
});

app.get("/token", async (req, res) => {
  const { roomId, name } = req.query as { roomId?: string; name?: string };
  if (!roomId || !name) {
    res.status(400).json({ error: "roomId and name are required" });
    return;
  }
  const participantIdentity = `${name.trim()}-${uuidv4().slice(0, 6)}`;
  const token = new AccessToken(LK_API_KEY, LK_API_SECRET, {
    identity: participantIdentity,
    name: name.trim(),
    ttl: "4h",
  });
  token.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true });
  res.json({ token: await token.toJwt(), identity: participantIdentity });
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on(EVENTS.JOIN_ROOM, ({ roomId, name, roomName }: JoinRoomPayload) => {
    const room = getOrCreateRoom(roomId, roomName);

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

    // Auto-assign to the first free office slot
    const freeIdx = room.offices.findIndex((o) => !o.ownerId);
    if (freeIdx !== -1) {
      room.offices[freeIdx] = { ownerId: user.id, ownerName: name, locked: false };
    }

    socket.join(roomId);
    socket.emit(EVENTS.ROOM_STATE, room);
    socket.to(roomId).emit(EVENTS.USER_JOINED, user);
    // Broadcast updated office assignments to existing members
    if (freeIdx !== -1) {
      socket.to(roomId).emit(EVENTS.OFFICE_UPDATED, {
        officeIndex: freeIdx,
        office: room.offices[freeIdx],
      });
    }

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
    io.to(user.room).emit(EVENTS.USER_UPDATED, { userId: user.id, isMuted: user.isMuted });
  });

  socket.on(EVENTS.TOGGLE_DEAFEN, () => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    user.isDeafened = !user.isDeafened;
    io.to(user.room).emit(EVENTS.USER_UPDATED, { userId: user.id, isDeafened: user.isDeafened });
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

  // Owner toggles their office lock (physical wall barrier)
  socket.on(EVENTS.LOCK_OFFICE, ({ officeIndex }: LockOfficePayload) => {
    const user = socketUserMap.get(socket.id);
    if (!user) return;
    const room = rooms.get(user.room);
    if (!room) return;
    const office = room.offices[officeIndex];
    if (!office || office.ownerId !== user.id) return;
    office.locked = !office.locked;
    io.to(user.room).emit(EVENTS.OFFICE_UPDATED, { officeIndex, office });
  });

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

  socket.on(EVENTS.KNOCK_RESPONSE, ({ knockerId, accepted }: KnockResponsePayload) => {
    const responder = socketUserMap.get(socket.id);
    if (!responder) return;
    const knockerSocketId = userSocketMap.get(knockerId);
    if (knockerSocketId) {
      io.to(knockerSocketId).emit(EVENTS.KNOCK_ANSWERED, {
        accepted,
        responderName: responder.name,
      });
    }
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

    // Free any owned office
    const offIdx = room.offices.findIndex((o) => o.ownerId === user.id);
    if (offIdx !== -1) {
      room.offices[offIdx] = emptyOffice();
      io.to(user.room).emit(EVENTS.OFFICE_UPDATED, {
        officeIndex: offIdx,
        office: room.offices[offIdx],
      });
    }
  }
  userSocketMap.delete(user.id);
  socketUserMap.delete(socketId);
}

httpServer.listen(PORT, () => {
  console.log(`Lifescale Office server running on http://localhost:${PORT}`);
});
