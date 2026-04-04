// Shared types between client and server

export type UserStatus = "available" | "deep-work" | "on-a-call";

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  position: Position2D;
  room: string;
  isMuted: boolean;
  isDeafened: boolean;
  status: UserStatus;
}

export interface Position2D {
  x: number;
  y: number;
}

export interface Room {
  id: string;
  name: string;
  users: User[];
  privateOfficeDoorClosed: boolean; // tracked server-side so all clients see it
}

export interface OfficeState {
  rooms: Room[];
}

// Socket.io event names
export const EVENTS = {
  // Client -> Server
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  MOVE: "move",
  TOGGLE_MUTE: "toggle_mute",
  TOGGLE_DEAFEN: "toggle_deafen",
  SET_STATUS: "set_status",
  TOGGLE_DOOR: "toggle_door",
  KNOCK: "knock",
  KNOCK_RESPONSE: "knock_response",

  // Server -> Client
  ROOM_STATE: "room_state",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  USER_MOVED: "user_moved",
  USER_UPDATED: "user_updated",
  DOOR_CHANGED: "door_changed",
  KNOCKED: "knocked",
  KNOCK_ANSWERED: "knock_answered",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// Payload types
export interface JoinRoomPayload   { roomId: string; name: string; }
export interface MovePayload       { position: Position2D; }
export interface SetStatusPayload  { status: UserStatus; }
export interface KnockPayload      { targetUserIds: string[]; }
export interface KnockedPayload    { knockerId: string; knockerName: string; }
export interface KnockResponsePayload { knockerId: string; accepted: boolean; }
export interface KnockAnsweredPayload { accepted: boolean; responderName: string; }
export interface DoorChangedPayload   { closed: boolean; }
