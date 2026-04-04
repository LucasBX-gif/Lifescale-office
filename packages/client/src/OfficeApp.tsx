import { useEffect, useState } from "react";
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
    connected, room, myUser,
    joinRoom, move, toggleMute, toggleDeafen, setStatus,
    privateOfficeDoorClosed, togglePrivateOfficeDoor,
    knock, knockQueue, respondToKnock, speakingNames,
  } = useOffice();

  useEffect(() => {
    if (connected) {
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

      <main className="app-main">
        <OfficeCanvas
          room={room}
          myUserId={myUser?.id ?? null}
          myPosition={myUser?.position ?? null}
          onMove={move}
          onStatusChange={setStatus}
          onZoneChange={setCurrentZone}
          privateOfficeDoorClosed={privateOfficeDoorClosed}
          onDoorToggle={togglePrivateOfficeDoor}
          onKnock={knock}
          isDark={theme === "dark"}
          speakingNames={speakingNames}
        />
      </main>

      {myUser && (
        <Controls
          user={myUser}
          currentZone={currentZone}
          privateOfficeDoorClosed={privateOfficeDoorClosed}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onDoorToggle={togglePrivateOfficeDoor}
        />
      )}

      <KnockNotification queue={knockQueue} onRespond={respondToKnock} />
    </div>
  );
}
