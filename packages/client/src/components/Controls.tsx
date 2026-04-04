import { User, OfficeAssignment } from "@lifescale/shared";

interface Props {
  user: User;
  currentZone: string;
  myOfficeIndex: -1 | 0 | 1;
  offices: [OfficeAssignment, OfficeAssignment];
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLockOffice: (officeIndex: 0 | 1) => void;
}

const STATUS_COLOR: Record<string, string> = {
  available:   "#3dffa0",
  "deep-work": "#ff6464",
  "on-a-call": "#ffbe32",
};

const STATUS_LABEL: Record<string, string> = {
  available:   "Available",
  "deep-work": "Deep Work",
  "on-a-call": "On a Call",
};

export function Controls({ user, currentZone, myOfficeIndex, offices, onToggleMute, onToggleDeafen, onLockOffice }: Props) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const ownsOffice = myOfficeIndex !== -1;
  const officeLocked = ownsOffice && offices[myOfficeIndex].locked;

  return (
    <footer className="controls-bar">
      <div className="ctrl-user">
        <div className="ctrl-user-avatar">{initials}</div>
        <div className="ctrl-user-info">
          <span className="ctrl-user-name">{user.name}</span>
          <span className="ctrl-user-status" style={{ color: STATUS_COLOR[user.status] }}>
            ● {STATUS_LABEL[user.status]}
          </span>
        </div>
      </div>

      <div className="ctrl-actions">
        <button
          className={`ctrl-btn ${user.isMuted ? "ctrl-btn--danger" : ""}`}
          onClick={onToggleMute}
          title={user.isMuted ? "Unmute mic" : "Mute mic"}
        >
          <span className="ctrl-btn-icon">{user.isMuted ? "🔇" : "🎤"}</span>
          <span className="ctrl-btn-label">{user.isMuted ? "Muted" : "Mic"}</span>
        </button>

        <button
          className={`ctrl-btn ${user.isDeafened ? "ctrl-btn--danger" : ""}`}
          onClick={onToggleDeafen}
          title={user.isDeafened ? "Undeafen" : "Deafen audio"}
        >
          <span className="ctrl-btn-icon">{user.isDeafened ? "🔕" : "🎧"}</span>
          <span className="ctrl-btn-label">{user.isDeafened ? "Deafened" : "Audio"}</span>
        </button>

        {ownsOffice && (
          <button
            className={`ctrl-btn ${officeLocked ? "ctrl-btn--accent" : ""}`}
            onClick={() => onLockOffice(myOfficeIndex as 0 | 1)}
            title={officeLocked ? "Unlock your office" : "Lock your office"}
          >
            <span className="ctrl-btn-icon">{officeLocked ? "🔒" : "🔓"}</span>
            <span className="ctrl-btn-label">{officeLocked ? "Locked" : "Lock"}</span>
          </button>
        )}
      </div>

      <div className="ctrl-zone">
        <span className="ctrl-zone-dot" />
        <span className="ctrl-zone-name">{currentZone}</span>
      </div>
    </footer>
  );
}
