import { useState } from "react";

const ROOMS = [
  { id: "lobby", name: "Lobby" },
  { id: "open-floor", name: "Open Floor" },
  { id: "focus-zone", name: "Focus Zone" },
  { id: "meeting-room-1", name: "Meeting Room 1" },
];

interface Props {
  onJoin: (name: string, roomId: string) => void;
}

export function JoinForm({ onJoin }: Props) {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("lobby");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim(), roomId);
  }

  return (
    <div className="join-screen">
      <form className="join-form" onSubmit={handleSubmit}>
        <h2>Join Lifescale Office</h2>
        <label>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </label>
        <label>
          Room
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {ROOMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Enter</button>
      </form>
    </div>
  );
}
