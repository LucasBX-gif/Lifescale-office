import { useRef, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RoomOptions,
  ConnectionState,
} from "livekit-client";

const MAX_HEAR_DISTANCE = 700; // canvas pixels (1200x800 virtual space)

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL as string;

const ROOM_OPTIONS: RoomOptions = {
  audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true },
  adaptiveStream: true,
  dynacast: true,
};

export interface PeerAudioInfo {
  name: string;
  positionPx: { x: number; y: number };
  zone: string;
}

export function useLiveKit() {
  const roomRef = useRef<Room | null>(null);

  const connect = useCallback(async (token: string) => {
    const room = new Room(ROOM_OPTIONS);
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log("[LiveKit] connection state:", state);
    });
    room.on(RoomEvent.Disconnected, () => {
      console.log("[LiveKit] disconnected");
    });
    room.on(RoomEvent.MediaDevicesError, (err: Error) => {
      console.error("[LiveKit] media device error:", err);
    });

    await room.connect(LIVEKIT_URL, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    await room.startAudio();

    console.log("[LiveKit] connected to room:", room.name);
  }, []);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  const setMicrophoneMuted = useCallback(async (muted: boolean) => {
    if (!roomRef.current) return;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!muted);
  }, []);

  const setAudioOutputMuted = useCallback((muted: boolean) => {
    if (!roomRef.current) return;
    roomRef.current.remoteParticipants.forEach((p) => p.setVolume(muted ? 0 : 1));
  }, []);

  /**
   * Called every 50 ms. For each LiveKit remote participant, resolves volume by:
   *
   *   1. War Room:        both in War Room → always 1.0 (collaboration zone)
   *   2. Private Office:  door is closed + one person inside, one outside → 0
   *   3. Default:         linear falloff from 1.0 at 0 px to 0.0 at MAX_HEAR_DISTANCE
   */
  const updateVolumes = useCallback(
    (
      myPositionPx: { x: number; y: number },
      myZone: string,
      peers: PeerAudioInfo[],
      privateOfficeDoorClosed: boolean
    ) => {
      const room = roomRef.current;
      if (!room) return;

      room.remoteParticipants.forEach((participant) => {
        const peer =
          peers.find((p) => p.name === participant.name) ??
          peers.find((p) => p.name === participant.identity);
        if (!peer) {
          participant.setVolume(1); // fallback: full volume if name can't be matched
          return;
        }

        let volume: number;

        const bothInWarRoom = myZone === "War Room" && peer.zone === "War Room";
        const doorBlocking =
          privateOfficeDoorClosed &&
          (myZone === "Private Office") !== (peer.zone === "Private Office");

        if (bothInWarRoom) {
          // War Room is always full volume regardless of distance
          volume = 1;
        } else if (doorBlocking) {
          // Private Office door is closed; sound doesn't cross it
          volume = 0;
        } else {
          const dx = peer.positionPx.x - myPositionPx.x;
          const dy = peer.positionPx.y - myPositionPx.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          volume = Math.max(0, 1 - distance / MAX_HEAR_DISTANCE);
        }

        participant.setVolume(volume);
      });
    },
    []
  );

  return { connect, disconnect, setMicrophoneMuted, setAudioOutputMuted, updateVolumes };
}
