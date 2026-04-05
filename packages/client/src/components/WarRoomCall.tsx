import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  Participant,
  LocalVideoTrack,
  RemoteVideoTrack,
} from "livekit-client";
import { User } from "@lifescale/shared";

interface Props {
  room: Room;
  myUser: User;
  isMuted: boolean;
  onToggleMute: () => void;
  cameraEnabled: boolean;
  onToggleCamera: () => void;
  screenShareEnabled: boolean;
  onToggleScreenShare: () => void;
  onLeave: () => void;
}

// ─── Video tile ───────────────────────────────────────────────────────────────

interface TileProps {
  participant: Participant;
  isLocal: boolean;
  isSpeaking: boolean;
}

function VideoTile({ participant, isLocal, isSpeaking }: TileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const camPub    = participant.getTrackPublication(Track.Source.Camera);
  const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);
  // Prefer screen share; fall back to camera
  const activePub = screenPub?.track ? screenPub : camPub;
  const rawTrack  = activePub?.track;
  const videoTrack =
    rawTrack instanceof LocalVideoTrack || rawTrack instanceof RemoteVideoTrack
      ? rawTrack
      : null;

  useEffect(() => {
    const el = videoRef.current;
    if (!videoTrack || !el) return;
    videoTrack.attach(el);
    return () => { videoTrack.detach(el); };
  }, [videoTrack]);

  const name     = participant.name ?? participant.identity ?? "Guest";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isScreen = !!screenPub?.track;

  return (
    <div
      className="vt"
      style={{ outline: isSpeaking ? "3px solid #3dffa0" : "3px solid #222" }}
    >
      {videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: isLocal && !isScreen ? "scaleX(-1)" : undefined,
          }}
        />
      ) : (
        <div className="vt-blank">
          <div className="vt-initials">{initials}</div>
        </div>
      )}

      <div className="vt-name">
        {isSpeaking && <span className="vt-dot" />}
        {name}{isLocal ? " (You)" : ""}
      </div>
    </div>
  );
}

// ─── Main call view ───────────────────────────────────────────────────────────

export function WarRoomCall({
  room,
  myUser: _myUser,
  isMuted,
  onToggleMute,
  cameraEnabled,
  onToggleCamera,
  screenShareEnabled,
  onToggleScreenShare,
  onLeave,
}: Props) {
  const [, setVersion] = useState(0);
  const forceUpdate = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const events: RoomEvent[] = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.ActiveSpeakersChanged,
    ];
    events.forEach((e) => room.on(e, forceUpdate));
    return () => events.forEach((e) => room.off(e, forceUpdate));
  }, [room, forceUpdate]);

  const remotes       = Array.from(room.remoteParticipants.values());
  const allParts      = [room.localParticipant as Participant, ...remotes];
  const count         = allParts.length;
  const cols          = count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 2 : 3;
  const speakerSet    = new Set(room.activeSpeakers.map((s) => s.identity));

  return (
    <div className="wrc">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="wrc-header">
        <span className="wrc-title">⚔ WAR ROOM</span>
        <span className="wrc-count">{count} participant{count !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Video grid ─────────────────────────────────────────────────────── */}
      <div
        className="wrc-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {allParts.map((p) => {
          const camSid = p.getTrackPublication(Track.Source.Camera)?.trackSid ?? "nc";
          const scrSid = p.getTrackPublication(Track.Source.ScreenShare)?.trackSid ?? "ns";
          return (
            <VideoTile
              key={`${p.identity}-${camSid}-${scrSid}`}
              participant={p}
              isLocal={p.identity === room.localParticipant.identity}
              isSpeaking={speakerSet.has(p.identity)}
            />
          );
        })}
      </div>

      {/* ── Bottom toolbar ─────────────────────────────────────────────────── */}
      <div className="wrc-bar">
        <button
          className={`wrc-btn${isMuted ? " wrc-btn--off" : ""}`}
          onClick={onToggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <span className="wrc-btn-icon">{isMuted ? "🔇" : "🎤"}</span>
          <span className="wrc-btn-label">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          className={`wrc-btn${!cameraEnabled ? " wrc-btn--off" : ""}`}
          onClick={onToggleCamera}
          title={cameraEnabled ? "Stop Camera" : "Start Camera"}
        >
          <span className="wrc-btn-icon">{cameraEnabled ? "📹" : "📷"}</span>
          <span className="wrc-btn-label">{cameraEnabled ? "Stop Video" : "Start Video"}</span>
        </button>

        <button
          className={`wrc-btn${screenShareEnabled ? " wrc-btn--on" : ""}`}
          onClick={onToggleScreenShare}
          title={screenShareEnabled ? "Stop Sharing" : "Share Screen"}
        >
          <span className="wrc-btn-icon">🖥️</span>
          <span className="wrc-btn-label">{screenShareEnabled ? "Stop Share" : "Share Screen"}</span>
        </button>

        <div className="wrc-bar-sep" />

        <button className="wrc-btn wrc-btn--leave" onClick={onLeave} title="Leave call">
          <span className="wrc-btn-icon">📞</span>
          <span className="wrc-btn-label">Leave</span>
        </button>
      </div>
    </div>
  );
}
