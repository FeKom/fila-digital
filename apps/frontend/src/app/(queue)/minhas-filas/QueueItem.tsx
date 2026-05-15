"use client";
import { useState } from "react";
import { exitQueue } from "@/domains/queue/queue.actions";
import type { UserQueue } from "@/types";

const QueueItem = ({ queue }: { queue: UserQueue }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExit = async () => {
    setLoading(true);
    setError(null);
    const result = await exitQueue(queue.commerce_id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const estimatedMinutes = queue.position * 5;

  return (
    <div className="queue-list-item">
      <div className="queue-list-item-info">
        <div className="queue-list-item-name">{queue.queue_name}</div>
        <div className="queue-list-item-commerce">{queue.commerce_name}</div>
        <div className="queue-list-item-position">
          <span className="queue-number queue-number-lg">
            #{queue.position}
          </span>
          <span className="queue-list-item-position-label">na fila</span>
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-3)",
            marginTop: "0.25rem",
          }}
        >
          Tempo estimado: ~{estimatedMinutes} min
        </div>
        {error && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--error)",
              marginTop: "0.25rem",
            }}
          >
            {error}
          </div>
        )}
      </div>
      <button
        type="button"
        className="fd-btn fd-btn-danger fd-btn-sm"
        onClick={handleExit}
        disabled={loading}
      >
        {loading ? "Saindo..." : "Sair"}
      </button>
    </div>
  );
};

export default QueueItem;
