import { useEffect, useRef, useState } from "react";
import { useOffice } from "./useOffice";
import { OfficeCanvas } from "./components/OfficeCanvas";
import { Controls } from "./components/Controls";
import { KnockNotification } from "./components/KnockNotification";

interface Props {
  workspaceId: string;
  workspaceName: string;
  userName: string;
  onLeave: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function OfficeApp({ workspaceId, workspaceName, userName, onLeave, theme, onToggleTheme }: Props) {
  const [currentZone, setCurrentZone] = useState("Open Floor");

  const {
    connected, room, myUser, myOfficeIndex,
    joinRoom, move, toggleMute, toggleDeafen, setStatus,
    privateOfficeDoorClosed, togglePrivateOfficeDoor,
    lockOffice, setOfficeStyle, knock, knockQueue, respondToKnock, speakingNames,
    canPlaybackAudio, resumeAudio,
  } = useOffice();

  const hasJoinedRef = useRef(false);
  useEffect(() => {
    if (connected && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom({ name: userName, roomId: workspaceId, roomName: workspaceName });
    }
  }, [connected]);

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

      <main className="app-main">
        <OfficeCanvas
          room={room}
          myUserId={myUser?.id ?? null}
          myPosition={myUser?.position ?? null}
          myOfficeIndex={myOfficeIndex}
          offices={room.offices}
          onMove={move}
          onStatusChange={setStatus}
          onZoneChange={setCurrentZone}
          privateOfficeDoorClosed={privateOfficeDoorClosed}
          onDoorToggle={togglePrivateOfficeDoor}
          onKnock={knock}
          onLockOffice={lockOffice}
          isDark={theme === "dark"}
          speakingNames={speakingNames}
        />
      </main>

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
