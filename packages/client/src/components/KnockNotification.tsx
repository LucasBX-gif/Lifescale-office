import { KnockNotification as KnockNotif } from "../useOffice";

interface Props {
  queue: KnockNotif[];
  onRespond: (knockerId: string, accepted: boolean) => void;
}

export function KnockNotification({ queue, onRespond }: Props) {
  if (queue.length === 0) return null;

  return (
    <div className="knock-stack">
      {queue.map((k) => (
        <div key={k.knockerId} className="knock-toast">
          <div className="knock-toast-icon">🚪</div>
          <div className="knock-toast-body">
            <p className="knock-toast-title">
              <strong>{k.knockerName}</strong> is knocking
            </p>
            <div className="knock-toast-actions">
              <button
                className="knock-btn knock-btn--accept"
                onClick={() => onRespond(k.knockerId, true)}
              >
                Accept
              </button>
              <button
                className="knock-btn knock-btn--ignore"
                onClick={() => onRespond(k.knockerId, false)}
              >
                Ignore
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
