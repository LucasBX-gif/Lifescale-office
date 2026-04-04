import { useState } from "react";
import { useOffice } from "./useOffice";
import { JoinForm } from "./components/JoinForm";
import { OfficeCanvas } from "./components/OfficeCanvas";
import { Controls } from "./components/Controls";
import { KnockNotification } from "./components/KnockNotification";

export default function App() {
  const [joined, setJoined] = useState(false);
  const [currentZone, setCurrentZone] = useState("Open Floor");

  const {
    connected, room, myUser,
    joinRoom, move, toggleMute, toggleDeafen, setStatus,
    privateOfficeDoorClosed, togglePrivateOfficeDoor,
    knock, knockQueue, respondToKnock,
  } = useOffice();

  async function handleJoin(name: string, roomId: string) {
    await joinRoom({ name, roomId });
    setJoined(true);
  }

  if (!connected) {
    return <div className="status-screen"><p>Connecting to Lifescale Office…</p></div>;
  }

  if (!joined || !room) {
    return <JoinForm onJoin={handleJoin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lifescale Office</h1>
        <span className="room-name">{room.name}</span>
        <span className="zone-badge">{currentZone}</span>
        <span className="connection-badge">Live</span>
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

      {/* Knock notifications — shown to Private Office occupant */}
      <KnockNotification queue={knockQueue} onRespond={respondToKnock} />
    </div>
  );
}
