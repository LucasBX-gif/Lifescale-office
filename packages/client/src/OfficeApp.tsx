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
}

export function OfficeApp({ workspaceId, workspaceName, userName, onLeave }: Props) {
  const [currentZone, setCurrentZone] = useState("Open Floor");

  const {
    connected,
    room,
    myUser,
    joinRoom,
    move,
    toggleMute,
    toggleDeafen,
    setStatus,
    privateOfficeDoorClosed,
    togglePrivateOfficeDoor,
    knock,
    knockQueue,
    respondToKnock,
  } = useOffice();

  useEffect(() => {
    if (connected) {
      joinRoom({ name: userName, roomId: workspaceId, roomName: workspaceName });
    }
  }, [connected]);

  if (!connected || !room) {
    return <div className="status-screen"><p>Connecting to office…</p></div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lifescale Office</h1>
        <span className="room-name">{workspaceName}</span>
        <span className="zone-badge">{currentZone}</span>
        <span className="connection-badge">Live</span>
        <button className="btn-leave" onClick={onLeave}>← Leave</button>
      </header>

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
