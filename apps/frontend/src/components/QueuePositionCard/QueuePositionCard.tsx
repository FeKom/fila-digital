import Link from "next/link";
import { UserQueue } from "@/types";

type QueuePositionCardProps = {
  queue: UserQueue;
};

const QueuePositionCard = ({ queue }: QueuePositionCardProps) => {
  return (
    <Link href={`/comercio/${queue.commerce_id}`} className="position-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "var(--text-1)",
              marginBottom: "0.15rem",
            }}
          >
            {queue.queue_name}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>
            {queue.commerce_name}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
        <span className="queue-number" style={{ fontSize: "4rem" }}>
          #{queue.position}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
          na fila
        </span>
      </div>
    </Link>
  );
};

export default QueuePositionCard;
