import { useRef, useCallback, useState } from "react";
import {
  Room,
  RoomEvent,
  RoomOptions,
  ConnectionState,
  Participant,
  Track,
  RemoteTrack,
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
  const [speakingNames, setSpeakingNames] = useState<Set<string>>(new Set());
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);

  const connect = useCallback(async (token: string) => {
    const room = new Room(ROOM_OPTIONS);
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log("[LiveKit] connection state:", state);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log("[LiveKit] disconnected");
      setSpeakingNames(new Set());
    });

    room.on(RoomEvent.MediaDevicesError, (err: Error) => {
      console.error("[LiveKit] media device error:", err);
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const names = new Set(
        speakers.flatMap((s) => [s.name, s.identity].filter(Boolean) as string[])
      );
      setSpeakingNames(names);
    });

    // Explicitly attach remote audio tracks so they actually play
    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.style.display = "none";
        document.body.appendChild(el);
        console.log("[LiveKit] audio track attached");
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((el) => el.remove());
      }
    });

    // Track whether browser is blocking audio playback
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      const blocked = !room.canPlaybackAudio;
      setCanPlaybackAudio(!blocked);
      if (blocked) {
        console.warn("[LiveKit] audio playback blocked — awaiting user gesture");
      }
    });

    await room.connect(LIVEKIT_URL, token);
    console.log("[LiveKit] connected to room:", room.name);

    // Enable mic — don't let this failure block audio playback
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.error("[LiveKit] mic enable failed:", err);
    }

    // Attempt to start audio immediately
    try {
      await room.startAudio();
      setCanPlaybackAudio(true);
    } catch (err) {
      console.warn("[LiveKit] startAudio failed (will retry on user gesture):", err);
      setCanPlaybackAudio(false);
    }
  }, []);

  /** Call this from a button click if the browser blocks autoplay */
  const resumeAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setCanPlaybackAudio(true);
    } catch (err) {
      console.error("[LiveKit] resumeAudio failed:", err);
    }
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

      const myInOffice =
        myZone === "Private Office" || myZone === "Private Office 2";

      room.remoteParticipants.forEach((participant) => {
        const peer =
          peers.find((p) => p.name === participant.name) ??
          peers.find((p) => p.name === participant.identity);

        if (!peer) {
          participant.setVolume(1);
          return;
        }

        const peerInOffice =
          peer.zone === "Private Office" || peer.zone === "Private Office 2";

        const bothInWarRoom = myZone === "War Room" && peer.zone === "War Room";

        // Block audio when the door is closed and exactly one side is inside an office
        const doorBlocking =
          privateOfficeDoorClosed && myInOffice !== peerInOffice;

        let volume: number;
        if (bothInWarRoom) {
          volume = 1;
        } else if (doorBlocking) {
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

  return {
    connect,
    disconnect,
    setMicrophoneMuted,
    setAudioOutputMuted,
    updateVolumes,
    speakingNames,
    canPlaybackAudio,
    resumeAudio,
  };
}
