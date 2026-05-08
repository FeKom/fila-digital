"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Commerce } from "@/types";
import {
  callNextParticipant,
  revertParticipants,
} from "@/domains/commerce/commerce.actions";

type Props = {
  commerce: Commerce;
  participantCount: number;
};

export default function QueueManageCard({ commerce, participantCount }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [callCount, setCallCount] = useState(1);
  const [revertCount, setRevertCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const run = async (
    action: () => Promise<{ error?: string }>,
    successMsg: string
  ) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await action();
    if (result.error) {
      setError(result.error);
    } else {
      setMessage(successMsg);
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            margin: 0,
          }}
        >
          Gerenciar Fila
        </p>
        <span
          style={{
            fontSize: "0.8rem",
            color: "var(--text-2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {participantCount}{" "}
          {participantCount === 1 ? "participante" : "participantes"}
        </span>
      </div>

      {/* Call next */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Chamar próximo
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className="fd-btn fd-btn-primary fd-btn-sm"
            disabled={loading || participantCount === 0}
            onClick={() =>
              run(() => callNextParticipant(commerce.id, 1), "Próximo chamado!")
            }
          >
            Chamar 1
          </button>
          <button
            className="fd-btn fd-btn-secondary fd-btn-sm"
            disabled={loading || participantCount === 0 || callCount < 2}
            onClick={() =>
              run(
                () => callNextParticipant(commerce.id, callCount),
                `${callCount} chamados!`
              )
            }
          >
            Chamar
          </button>
          <input
            type="number"
            className="fd-input"
            value={callCount}
            min={1}
            max={50}
            onChange={(e) =>
              setCallCount(Math.max(1, parseInt(e.target.value) || 1))
            }
            style={{
              width: "64px",
              padding: "0.35rem 0.5rem",
              fontSize: "0.85rem",
            }}
          />
        </div>
      </div>

      {/* Revert */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Reverter chamada
        </span>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className="fd-btn fd-btn-ghost fd-btn-sm"
            disabled={loading}
            onClick={() =>
              run(
                () => revertParticipants(commerce.id, 1),
                "1 participante revertido"
              )
            }
          >
            Reverter 1
          </button>
          <button
            className="fd-btn fd-btn-ghost fd-btn-sm"
            disabled={loading || revertCount < 2}
            onClick={() =>
              run(
                () => revertParticipants(commerce.id, revertCount),
                `${revertCount} revertidos`
              )
            }
          >
            Reverter
          </button>
          <input
            type="number"
            className="fd-input"
            value={revertCount}
            min={1}
            max={10}
            onChange={(e) =>
              setRevertCount(Math.max(1, parseInt(e.target.value) || 1))
            }
            style={{
              width: "64px",
              padding: "0.35rem 0.5rem",
              fontSize: "0.85rem",
            }}
          />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div className="fd-alert-error" style={{ fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            background: "var(--success-bg)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            fontSize: "0.85rem",
            color: "var(--success)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
