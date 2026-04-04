import { useEffect, useReducer, useCallback, useRef, useState } from "react";
import { socket } from "./socket";
import { useLiveKit } from "./useLiveKit";
import { detectZone, pctToPx } from "./zones";
import {
  EVENTS,
  User,
  Room,
  OfficeAssignment,
  Position2D,
  JoinRoomPayload,
  MovePayload,
  UserStatus,
  SetStatusPayload,
  KnockPayload,
  KnockResponsePayload,
  KnockedPayload,
  KnockAnsweredPayload,
  DoorChangedPayload,
  LockOfficePayload,
  OfficeUpdatedPayload,
} from "@lifescale/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// ─── State ────────────────────────────────────────────────────────────────────

interface OfficeState {
  connected: boolean;
  currentUserId: string | null;
  room: Room | null;
}

type Action =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "ROOM_STATE"; room: Room; userId: string }
  | { type: "USER_JOINED"; user: User }
  | { type: "USER_LEFT"; userId: string }
  | { type: "USER_MOVED"; userId: string; position: Position2D }
  | { type: "USER_UPDATED"; userId: string; patch: Partial<User> }
  | { type: "DOOR_CHANGED"; closed: boolean }
  | { type: "OFFICE_UPDATED"; officeIndex: 0 | 1; office: OfficeAssignment };

function emptyOffice(): OfficeAssignment {
  return { ownerId: "", ownerName: "", locked: false };
}

function reducer(state: OfficeState, action: Action): OfficeState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, connected: true };
    case "DISCONNECTED":
      return { ...state, connected: false, room: null, currentUserId: null };
    case "ROOM_STATE":
      return { ...state, room: action.room, currentUserId: action.userId };
    case "USER_JOINED":
      if (!state.room) return state;
      return { ...state, room: { ...state.room, users: [...state.room.users, action.user] } };
    case "USER_LEFT":
      if (!state.room) return state;
      return {
        ...state,
        room: { ...state.room, users: state.room.users.filter((u) => u.id !== action.userId) },
      };
    case "USER_MOVED":
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          users: state.room.users.map((u) =>
            u.id === action.userId ? { ...u, position: action.position } : u
          ),
        },
      };
    case "USER_UPDATED":
      if (!state.room) return state;
      return {
        ...state,
        room: {
          ...state.room,
          users: state.room.users.map((u) =>
            u.id === action.userId ? { ...u, ...action.patch } : u
          ),
        },
      };
    case "DOOR_CHANGED":
      if (!state.room) return state;
      return { ...state, room: { ...state.room, privateOfficeDoorClosed: action.closed } };
    case "OFFICE_UPDATED": {
      if (!state.room) return state;
      const newOffices: [OfficeAssignment, OfficeAssignment] = [
        ...state.room.offices,
      ] as [OfficeAssignment, OfficeAssignment];
      newOffices[action.officeIndex] = action.office;
      return { ...state, room: { ...state.room, offices: newOffices } };
    }
    default:
      return state;
  }
}

const initialState: OfficeState = { connected: false, currentUserId: null, room: null };

// ─── Knock notification ───────────────────────────────────────────────────────

export interface KnockNotification {
  knockerId: string;
  knockerName: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOffice() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pendingNameRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const [knockQueue, setKnockQueue] = useState<KnockNotification[]>([]);

  const { connect: lkConnect, disconnect: lkDisconnect, setMicrophoneMuted, setAudioOutputMuted, updateVolumes, speakingNames } =
    useLiveKit();

  const doorClosedRef = useRef(false);
  useEffect(() => {
    doorClosedRef.current = state.room?.privateOfficeDoorClosed ?? false;
  }, [state.room?.privateOfficeDoorClosed]);

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();

    socket.on("connect", () => dispatch({ type: "CONNECTED" }));
    socket.on("disconnect", () => {
      dispatch({ type: "DISCONNECTED" });
      lkDisconnect();
    });

    socket.on(EVENTS.ROOM_STATE, (room: Room) => {
      const me = room.users.find((u) => u.name === pendingNameRef.current);
      dispatch({ type: "ROOM_STATE", room, userId: me?.id ?? "" });
    });

    socket.on(EVENTS.USER_JOINED, (user: User) =>
      dispatch({ type: "USER_JOINED", user })
    );

    socket.on(EVENTS.USER_LEFT, ({ userId }: { userId: string }) =>
      dispatch({ type: "USER_LEFT", userId })
    );

    socket.on(
      EVENTS.USER_MOVED,
      ({ userId, position }: { userId: string; position: Position2D }) =>
        dispatch({ type: "USER_MOVED", userId, position })
    );
    socket.on(
      EVENTS.USER_UPDATED,
      ({ userId, ...patch }: { userId: string } & Partial<User>) =>
        dispatch({ type: "USER_UPDATED", userId, patch })
    );

    socket.on(EVENTS.DOOR_CHANGED, ({ closed }: DoorChangedPayload) =>
      dispatch({ type: "DOOR_CHANGED", closed })
    );

    socket.on(EVENTS.OFFICE_UPDATED, ({ officeIndex, office }: OfficeUpdatedPayload) =>
      dispatch({ type: "OFFICE_UPDATED", officeIndex, office })
    );

    socket.on(EVENTS.KNOCKED, ({ knockerId, knockerName }: KnockedPayload) => {
      setKnockQueue((q) => {
        if (q.some((k) => k.knockerId === knockerId)) return q;
        return [...q, { knockerId, knockerName }];
      });
    });

    socket.on(EVENTS.KNOCK_ANSWERED, ({ accepted, responderName }: KnockAnsweredPayload) => {
      console.info(
        accepted
          ? `${responderName} accepted your knock — door is open!`
          : `${responderName} ignored your knock.`
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      lkDisconnect();
    };
  }, [lkDisconnect]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const joinRoom = useCallback(
    async ({ name, roomId, roomName }: JoinRoomPayload) => {
      pendingNameRef.current = name;
      socket.emit(EVENTS.JOIN_ROOM, { name, roomId, roomName } satisfies JoinRoomPayload);
      const res = await fetch(
        `${SERVER_URL}/token?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(name)}`
      );
      if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
      const { token } = (await res.json()) as { token: string; identity: string };
      await lkConnect(token);
    },
    [lkConnect]
  );

  const move = useCallback((position: Position2D) => {
    socket.emit(EVENTS.MOVE, { position } satisfies MovePayload);
  }, []);

  const toggleMute = useCallback(() => {
    const user = stateRef.current.room?.users.find(
      (u) => u.id === stateRef.current.currentUserId
    );
    if (!user) return;
    const newMuted = !user.isMuted;
    socket.emit(EVENTS.TOGGLE_MUTE);
    setMicrophoneMuted(newMuted);
  }, [setMicrophoneMuted]);

  const toggleDeafen = useCallback(() => {
    const user = stateRef.current.room?.users.find(
      (u) => u.id === stateRef.current.currentUserId
    );
    if (!user) return;
    const newDeafened = !user.isDeafened;
    socket.emit(EVENTS.TOGGLE_DEAFEN);
    setAudioOutputMuted(newDeafened);
  }, [setAudioOutputMuted]);

  const setStatus = useCallback((status: UserStatus) => {
    socket.emit(EVENTS.SET_STATUS, { status } satisfies SetStatusPayload);
  }, []);

  const togglePrivateOfficeDoor = useCallback(() => {
    socket.emit(EVENTS.TOGGLE_DOOR);
  }, []);

  const lockOffice = useCallback((officeIndex: 0 | 1) => {
    socket.emit(EVENTS.LOCK_OFFICE, { officeIndex } satisfies LockOfficePayload);
  }, []);

  const knock = useCallback((targetUserIds: string[]) => {
    socket.emit(EVENTS.KNOCK, { targetUserIds } satisfies KnockPayload);
  }, []);

  const respondToKnock = useCallback((knockerId: string, accepted: boolean) => {
    socket.emit(EVENTS.KNOCK_RESPONSE, { knockerId, accepted } satisfies KnockResponsePayload);
    setKnockQueue((q) => q.filter((k) => k.knockerId !== knockerId));
  }, []);

  // ── Proximity volume — 50 ms interval ─────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const { room, currentUserId } = stateRef.current;
      if (!room || !currentUserId) return;
      const me = room.users.find((u) => u.id === currentUserId);
      if (!me) return;
      const myPx = pctToPx(me.position);
      const myZone = detectZone(myPx.x, myPx.y);
      const peers = room.users
        .filter((u) => u.id !== currentUserId)
        .map((u) => {
          const px = pctToPx(u.position);
          return { name: u.name, positionPx: px, zone: detectZone(px.x, px.y) };
        });
      updateVolumes(myPx, myZone, peers, doorClosedRef.current);
    }, 50);
    return () => clearInterval(id);
  }, [updateVolumes]);

  const myUser =
    state.room && state.currentUserId
      ? (state.room.users.find((u) => u.id === state.currentUserId) ?? null)
      : null;

  // Which office index does the current user own? (-1 if none)
  const myOfficeIndex: -1 | 0 | 1 = (() => {
    if (!state.room || !state.currentUserId) return -1;
    const idx = state.room.offices.findIndex((o) => o.ownerId === state.currentUserId);
    return (idx as -1 | 0 | 1);
  })();

  return {
    connected: state.connected,
    room: state.room,
    myUser,
    myOfficeIndex,
    joinRoom,
    move,
    toggleMute,
    toggleDeafen,
    setStatus,
    privateOfficeDoorClosed: state.room?.privateOfficeDoorClosed ?? false,
    togglePrivateOfficeDoor,
    lockOffice,
    knock,
    knockQueue,
    respondToKnock,
    speakingNames,
  };
}
