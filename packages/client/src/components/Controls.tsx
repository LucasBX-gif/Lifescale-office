import { useState } from "react";
import { User, OfficeAssignment } from "@lifescale/shared";

interface Props {
  user: User;
  currentZone: string;
  myOfficeIndex: -1 | 0 | 1;
  offices: [OfficeAssignment, OfficeAssignment];
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onLockOffice: (officeIndex: 0 | 1) => void;
  onSetStyle: (officeIndex: 0 | 1, style: number) => void;
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

export const OFFICE_THEMES = [
  { name: "Executive",    desc: "Warm wood",      floorA: "#5C3D1E", floorB: "#7A5230", accent: "#8B5E3C" },
  { name: "Marble Suite", desc: "Marble & gold",  floorA: "#E8E4D0", floorB: "#D0CAAA", accent: "#D4AF37" },
  { name: "Cyber Dark",   desc: "Neon grid",      floorA: "#020814", floorB: "#03060F", accent: "#00B4FF" },
  { name: "Nordic",       desc: "Light birch",    floorA: "#D8D0B4", floorB: "#C8BEA0", accent: "#8FB89A" },
  { name: "Royal Gold",   desc: "Luxury burgundy",floorA: "#3A0A14", floorB: "#2C0810", accent: "#D4A017" },
];

export function Controls({ user, currentZone, myOfficeIndex, offices, onToggleMute, onToggleDeafen, onLockOffice, onSetStyle }: Props) {
  const [showStyles, setShowStyles] = useState(false);
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const ownsOffice = myOfficeIndex !== -1;
  const officeLocked = ownsOffice && offices[myOfficeIndex].locked;
  const currentStyle = ownsOffice ? offices[myOfficeIndex].style ?? 0 : 0;

  return (
    <footer className="controls-bar" style={{ position: "relative" }}>

      {/* Style picker panel */}
      {showStyles && ownsOffice && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#111111",
          border: "2px solid #8B5E3C",
          borderRadius: 2,
          padding: "10px 12px",
          zIndex: 100,
          minWidth: 320,
          fontFamily: "'Courier New', monospace",
        }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#8B5E3C", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
            Office Theme
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {OFFICE_THEMES.map((t, i) => (
              <button
                key={i}
                onClick={() => { onSetStyle(myOfficeIndex as 0 | 1, i); setShowStyles(false); }}
                style={{
                  background: currentStyle === i ? "#1a1a1a" : "#0a0a0a",
                  border: `2px solid ${currentStyle === i ? t.accent : "#333"}`,
                  borderRadius: 2,
                  cursor: "pointer",
                  padding: "5px 3px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  outline: "none",
                }}
              >
                {/* Floor preview swatch — flat pixel block */}
                <div style={{
                  width: 40,
                  height: 28,
                  background: t.floorA,
                  border: `2px solid ${t.accent}`,
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: t.accent }} />
                  {currentStyle === i && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: t.accent }}>✓</div>
                  )}
                </div>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, color: currentStyle === i ? t.accent : "#888", textAlign: "center", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User identity */}
      <div className="ctrl-user">
        <div className="ctrl-user-avatar">{initials}</div>
        <div className="ctrl-user-info">
          <span className="ctrl-user-name">{user.name}</span>
          <span className="ctrl-user-status" style={{ color: STATUS_COLOR[user.status] }}>
            ● {STATUS_LABEL[user.status]}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="ctrl-actions">
        {ownsOffice && (
          <button
            className={`ctrl-btn ${showStyles ? "ctrl-btn--accent" : ""}`}
            onClick={() => setShowStyles((s) => !s)}
            title="Customise your office"
          >
            <span className="ctrl-btn-icon">🎨</span>
            <span className="ctrl-btn-label">Style</span>
          </button>
        )}

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

      {/* Zone pill */}
      <div className="ctrl-zone">
        <span className="ctrl-zone-dot" />
        <span className="ctrl-zone-name">{currentZone}</span>
      </div>
    </footer>
  );
}
