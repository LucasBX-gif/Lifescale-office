import { User } from "@lifescale/shared";

interface Props {
  user: User;
  currentZone: string;
  privateOfficeDoorClosed: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onDoorToggle: () => void;
}

export function Controls({
  user,
  currentZone,
  privateOfficeDoorClosed,
  onToggleMute,
  onToggleDeafen,
  onDoorToggle,
}: Props) {
  const inPrivateOffice = currentZone === "Private Office";

  return (
    <footer className="controls">
      <span className="controls-name">{user.name}</span>

      <button
        className={`controls-btn ${user.isMuted ? "active" : ""}`}
        onClick={onToggleMute}
      >
        {user.isMuted ? "Unmute" : "Mute"}
      </button>

      <button
        className={`controls-btn ${user.isDeafened ? "active" : ""}`}
        onClick={onToggleDeafen}
      >
        {user.isDeafened ? "Undeafen" : "Deafen"}
      </button>

      {inPrivateOffice && (
        <button
          className={`controls-btn controls-btn--door ${privateOfficeDoorClosed ? "active" : ""}`}
          onClick={onDoorToggle}
          title="Toggle Private Office door"
        >
          {privateOfficeDoorClosed ? "🔒 Door closed" : "🚪 Door open"}
        </button>
      )}
    </footer>
  );
}
