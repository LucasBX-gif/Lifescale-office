import { User } from "@lifescale/shared";

interface Props {
  user: User;
  currentZone: string;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
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

export function Controls({ user, currentZone, onToggleMute, onToggleDeafen }: Props) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

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
      </div>

      <div className="ctrl-zone">
        <span className="ctrl-zone-dot" />
        <span className="ctrl-zone-name">{currentZone}</span>
      </div>
    </footer>
  );
}
