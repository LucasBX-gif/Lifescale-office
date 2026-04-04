import { useState } from "react";
import { User, UserStatus } from "@lifescale/shared";

interface Props {
  user: User;
  isMe: boolean;
  onStatusChange?: (status: UserStatus) => void;
}

const STATUS_META: Record<UserStatus, { label: string; icon: string; className: string }> = {
  available:  { label: "Available",  icon: "●", className: "status--available" },
  "deep-work": { label: "Deep Work",  icon: "⬤", className: "status--deep-work" },
  "on-a-call": { label: "On a Call",  icon: "◉", className: "status--on-a-call" },
};

const STATUS_ORDER: UserStatus[] = ["available", "deep-work", "on-a-call"];

export function Avatar({ user, isMe, onStatusChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const meta = STATUS_META[user.status];

  function handleAvatarClick(e: React.MouseEvent) {
    if (!isMe) return;
    e.stopPropagation(); // don't trigger floor move
    setPickerOpen((o) => !o);
  }

  function handlePickerSelect(e: React.MouseEvent, status: UserStatus) {
    e.stopPropagation();
    onStatusChange?.(status);
    setPickerOpen(false);
  }

  return (
    <div
      className={`avatar ${isMe ? "avatar--me" : ""} ${user.isMuted ? "avatar--muted" : ""}`}
      style={{ left: `${user.position.x}%`, top: `${user.position.y}%` }}
    >
      {/* Status badge sits above the avatar circle */}
      <div className={`avatar-status ${meta.className}`}>
        <span className="avatar-status-icon">{meta.icon}</span>
        <span className="avatar-status-label">{meta.label}</span>
      </div>

      {/* Avatar circle */}
      <div
        className={`avatar-circle ${isMe ? "avatar-circle--me" : ""}`}
        onClick={handleAvatarClick}
        title={isMe ? "Click to change status" : user.name}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} />
        ) : (
          <span>{initials}</span>
        )}
        {user.isMuted && <div className="avatar-mute-badge">🔇</div>}
      </div>

      <div className="avatar-label">{user.name}</div>

      {/* Status picker — only rendered for my avatar */}
      {isMe && pickerOpen && (
        <div className="status-picker" onClick={(e) => e.stopPropagation()}>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              className={`status-picker-btn ${s === user.status ? "status-picker-btn--active" : ""} ${STATUS_META[s].className}`}
              onClick={(e) => handlePickerSelect(e, s)}
            >
              <span>{STATUS_META[s].icon}</span>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
