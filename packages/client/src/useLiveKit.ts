import { useRef, useCallback, useState } from "react";
import {
  Room,
  RoomEvent,
  RoomOptions,
  ConnectionState,
  Participant,
  Track,
  RemoteTrack,
  VideoPresets,
} from "livekit-client";

const MAX_HEAR_DISTANCE = 700;

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL as string;

const ROOM_OPTIONS: RoomOptions = {
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: false,   // off — adds ~100 ms latency
    autoGainControl: false,    // off — causes pumping artifacts
    sampleRate: 48000,
    channelCount: 1,
  },
  videoCaptureDefaults: {
    resolution: VideoPresets.h1080.resolution, // capture source at 1080p
    facingMode: "user",
  },
  publishDefaults: {
    videoSimulcastLayers: [],  // no simulcast — single full-quality stream always
    videoEncoding: {
      maxBitrate: 8_000_000,   // 8 Mbps — near-pristine
      maxFramerate: 30,
      priority: "high",
    },
    videoCodec: "h264",        // hardware enc/dec on every device → lowest latency
    stopMicTrackOnMute: false, // keep track alive — faster unmute response
    dtx: true,
    red: true,
  },
  adaptiveStream: false,  // never reduce quality based on UI element size
  dynacast: false,        // never drop quality based on subscriber count
};

export interface PeerAudioInfo {
  name: string;
  positionPx: { x: number; y: number };
  zone: string;
}

export function useLiveKit() {
  const roomRef = useRef<Room | null>(null);
  const [lkRoom, setLkRoom] = useState<Room | null>(null);
  const [speakingNames, setSpeakingNames] = useState<Set<string>>(new Set());
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  // Per-participant smoothed volume: avoids hard cuts when door closes or distance jumps
  const smoothedVolsRef = useRef<Map<string, number>>(new Map());

  const connect = useCallback(async (token: string) => {
    const room = new Room(ROOM_OPTIONS);
    roomRef.current = room;

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log("[LiveKit] connection state:", state);
    });

    room.on(RoomEvent.Disconnected, () => {
      console.log("[LiveKit] disconnected");
      setSpeakingNames(new Set());
      smoothedVolsRef.current.clear();
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

    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      const blocked = !room.canPlaybackAudio;
      setCanPlaybackAudio(!blocked);
      if (blocked) console.warn("[LiveKit] audio blocked — awaiting user gesture");
    });

    await room.connect(LIVEKIT_URL, token);
    setLkRoom(room);
    console.log("[LiveKit] connected:", room.name);

    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.error("[LiveKit] mic enable failed:", err);
    }

    try {
      await room.startAudio();
      setCanPlaybackAudio(true);
    } catch (err) {
      console.warn("[LiveKit] startAudio needs user gesture:", err);
      setCanPlaybackAudio(false);
    }
  }, []);

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
    setLkRoom(null);
    setCameraEnabled(false);
    setScreenShareEnabled(false);
    smoothedVolsRef.current.clear();
  }, []);

  const enableCamera = useCallback(async (enabled: boolean) => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(enabled);
      setCameraEnabled(enabled);
    } catch (err) {
      console.error("[LiveKit] camera toggle failed:", err);
    }
  }, []);

  const enableScreenShare = useCallback(async (enabled: boolean) => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(enabled);
      setScreenShareEnabled(enabled);
    } catch (err) {
      console.error("[LiveKit] screen share toggle failed:", err);
    }
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
   * Called every 50 ms.
   * Volumes are smoothed toward their target each tick (LERP factor 0.25)
   * so transitions are ~200 ms rather than instant cuts.
   */
  const updateVolumes = useCallback(
    (
      myPositionPx: { x: number; y: number },
      myZone: string,
      peers: PeerAudioInfo[],
      officesLocked: [boolean, boolean]
    ) => {
      const room = roomRef.current;
      if (!room) return;

      // Which office index am I in? (-1 = not in a private office)
      const myOfficeIdx =
        myZone === "Private Office" ? 0 : myZone === "Private Office 2" ? 1 : -1;

      room.remoteParticipants.forEach((participant) => {
        const peer =
          peers.find((p) => p.name === participant.name) ??
          peers.find((p) => p.name === participant.identity);

        if (!peer) {
          participant.setVolume(1);
          return;
        }

        const peerOfficeIdx =
          peer.zone === "Private Office" ? 0 : peer.zone === "Private Office 2" ? 1 : -1;

        const bothInWarRoom  = myZone === "War Room" && peer.zone === "War Room";
        // War Room is a video-call space — fully isolated from the corridor.
        // If exactly one side is in the War Room, silence audio in both directions.
        const warRoomBlocking = (myZone === "War Room") !== (peer.zone === "War Room");

        // Locked-door isolation: a locked office seals audio in both directions.
        // Blocked if I'm in a locked office and peer isn't in the same one,
        // OR peer is in a locked office and I'm not in the same one.
        const myOfficeLocked  = myOfficeIdx  >= 0 && officesLocked[myOfficeIdx  as 0 | 1];
        const peerOfficeLocked = peerOfficeIdx >= 0 && officesLocked[peerOfficeIdx as 0 | 1];
        const lockBlocking =
          (myOfficeLocked  && peerOfficeIdx !== myOfficeIdx) ||
          (peerOfficeLocked && myOfficeIdx  !== peerOfficeIdx);

        let target: number;
        if (bothInWarRoom) {
          target = 1;
        } else if (warRoomBlocking || lockBlocking) {
          target = 0;
        } else {
          const dx = peer.positionPx.x - myPositionPx.x;
          const dy = peer.positionPx.y - myPositionPx.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          target = Math.max(0, 1 - dist / MAX_HEAR_DISTANCE);
        }

        // Smooth toward target: avoids hard pops when zones/distance change
        const key = participant.identity;
        const prev = smoothedVolsRef.current.get(key) ?? target;
        const smoothed = prev + (target - prev) * 0.25;
        smoothedVolsRef.current.set(key, smoothed);
        participant.setVolume(smoothed);
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
    lkRoom,
    enableCamera,
    enableScreenShare,
    cameraEnabled,
    screenShareEnabled,
  };
}
