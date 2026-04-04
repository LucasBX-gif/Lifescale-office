import { useRef } from "react";
import { Room, Position2D, UserStatus } from "@lifescale/shared";
import { Avatar } from "./Avatar";

interface Props {
  room: Room;
  myUserId: string | null;
  onMove: (position: Position2D) => void;
  onStatusChange: (status: UserStatus) => void;
}

export function OfficeFloor({ room, myUserId, onMove, onStatusChange }: Props) {
  const floorRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!floorRef.current) return;
    const rect = floorRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMove({ x: Math.round(x), y: Math.round(y) });
  }

  return (
    <div className="office-floor" ref={floorRef} onClick={handleClick}>
      {room.users.map((user) => (
        <Avatar
          key={user.id}
          user={user}
          isMe={user.id === myUserId}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
