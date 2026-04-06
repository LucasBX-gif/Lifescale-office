import { useEffect, useRef, useState, useCallback } from "react";
import { useOffice } from "./useOffice";
import { OfficeCanvas } from "./components/OfficeCanvas";
import { Controls } from "./components/Controls";
import { KnockNotification } from "./components/KnockNotification";
import { WarRoomCall } from "./components/WarRoomCall";

interface Props {
  workspaceId: string;
  workspaceName: string;
  userName: string;
  isOwner: boolean;
  onLeave: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function OfficeApp({ workspaceId, workspaceName, userName, isOwner, onLeave, theme, onToggleTheme }: Props) {
  const [currentZone, setCurrentZone] = useState("Open Floor");

  const {
    connected, kicked, room, myUser, myOfficeIndex,
    joinRoom, move, toggleMute, toggleDeafen, setStatus,
    privateOfficeDoorClosed, togglePrivateOfficeDoor,
    lockOffice, setOfficeStyle, knock, knockQueue, respondToKnock, speakingNames,
    canPlaybackAudio, resumeAudio,
    lkRoom, enableCamera, enableScreenShare, cameraEnabled, screenShareEnabled,
  } = useOffice();

  const [inWarRoomCall, setInWarRoomCall] = useState(false);
  const [respawnCount, setRespawnCount]   = useState(0);
  const inWarRoomCallRef = useRef(false);

  const handleZoneChange = useCallback((zone: string) => {
    setCurrentZone(zone);
    if (zone === "War Room" && !inWarRoomCallRef.current) {
      inWarRoomCallRef.current = true;
      setInWarRoomCall(true);
    }
  }, []);

  const handleLeaveCall = useCallback(() => {
    inWarRoomCallRef.current = false;
    setInWarRoomCall(false);
    setRespawnCount((n) => n + 1);
    // Also disable camera/screen share so they don't stay on
    enableCamera(false).catch(() => {});
    enableScreenShare(false).catch(() => {});
    // Sync server position to corridor above War Room door
    move({ x: 50, y: 20 });
  }, [move, enableCamera, enableScreenShare]);

  const hasJoinedRef = useRef(false);
  useEffect(() => {
    if (connected && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom({ name: userName, roomId: workspaceId, roomName: workspaceName, isOwner });
    }
  }, [connected]);

  if (kicked) {
    return (
      <div className="status-screen">
        <p>You joined from another tab — this session has been closed.</p>
      </div>
    );
  }

  if (!connected || !room) {
    return <div className="status-screen"><p>Connecting to office…</p></div>;
  }

  const onlineCount = room.users.length;

  return (
    <div className="app">
      <nav className="office-nav">
        <div className="lobby-nav-brand">
          <span className="lobby-nav-icon">🏢</span>
          <span className="lobby-nav-title">{workspaceName}</span>
          {onlineCount > 0 && (
            <span className="office-online-badge">{onlineCount} online</span>
          )}
        </div>
        <div className="lobby-nav-right">
          <span className="connection-badge">Live</span>
          <button className="theme-toggle theme-toggle--sm" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="btn-leave" onClick={onLeave}>← Leave</button>
        </div>
      </nav>

      {!canPlaybackAudio && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          background: "#ff6464", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          padding: "10px 16px", fontSize: "0.875rem", fontWeight: 600,
        }}>
          <span>🔇 Audio blocked by browser</span>
          <button
            onClick={resumeAudio}
            style={{
              background: "#fff", color: "#ff6464",
              border: "none", borderRadius: 6, padding: "4px 14px",
              fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
            }}
          >
            Enable Audio
          </button>
        </div>
      )}

      {inWarRoomCall && lkRoom && myUser ? (
        <WarRoomCall
          room={lkRoom}
          myUser={myUser}
          isMuted={myUser.isMuted}
          onToggleMute={toggleMute}
          cameraEnabled={cameraEnabled}
          onToggleCamera={() => enableCamera(!cameraEnabled)}
          screenShareEnabled={screenShareEnabled}
          onToggleScreenShare={() => enableScreenShare(!screenShareEnabled)}
          onLeave={handleLeaveCall}
        />
      ) : (
        <main className="app-main">
          <OfficeCanvas
            room={room}
            myUserId={myUser?.id ?? null}
            myPosition={myUser?.position ?? null}
            myOfficeIndex={myOfficeIndex}
            offices={room.offices}
            onMove={move}
            onStatusChange={setStatus}
            onZoneChange={handleZoneChange}
            privateOfficeDoorClosed={privateOfficeDoorClosed}
            onDoorToggle={togglePrivateOfficeDoor}
            onKnock={knock}
            onLockOffice={lockOffice}
            isDark={theme === "dark"}
            speakingNames={speakingNames}
            respawnCount={respawnCount}
          />
        </main>
      )}

      {myUser && (
        <Controls
          user={myUser}
          currentZone={currentZone}
          myOfficeIndex={myOfficeIndex}
          offices={room.offices}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onLockOffice={lockOffice}
          onSetStyle={setOfficeStyle}
        />
      )}

      <KnockNotification queue={knockQueue} onRespond={respondToKnock} />
    </div>
  );
}
