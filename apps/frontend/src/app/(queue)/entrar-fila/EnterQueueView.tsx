"use client";

import { useState, useEffect } from "react";
import { Commerce } from "@/types";
import { getAnonymousId } from "@/lib/anonymousId";
import {
  enterDirect,
  enterViaToken,
  exitQueueAnon,
} from "@/domains/queue/queue.actions";

type Props = {
  commerce: Commerce;
  token?: string;
  mode?: string;
};

export default function EnterQueueView({ commerce, token, mode }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [position, setPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState("");
  const [exitState, setExitState] = useState<"idle" | "loading">("idle");

  useEffect(() => {
    setAnonymousId(getAnonymousId());
  }, []);

  const queue = commerce.queue;
  const usesToken =
    mode === "qrcode" || mode === "magic-link" || (!mode && !!token);

  const handleEnter = async () => {
    if (!queue) return;
    setState("loading");
    setError(null);

    const result =
      usesToken && token
        ? await enterViaToken(queue.id, token, anonymousId)
        : await enterDirect(commerce.id, queue.id, anonymousId);

    if (result.error) {
      setError(result.error);
      setState("error");
    } else {
      setPosition(result.position ?? null);
      setState("done");
    }
  };

  if (state === "done") {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "3rem 2rem",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            background: "var(--success-bg)",
            border: "1px solid rgba(74, 222, 128, 0.2)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="var(--success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="page-title" style={{ textAlign: "center" }}>
          Você entrou na fila!
        </h2>
        <p style={{ fontSize: "0.95rem", color: "var(--text-2)" }}>
          {commerce.name}
        </p>
        {position !== null && (
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                marginBottom: "0.5rem",
              }}
            >
              Sua posição
            </div>
            <span className="queue-number" style={{ fontSize: "5rem" }}>
              #{position}
            </span>
          </div>
        )}
        <p style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>
          Aguarde sua vez. Você será chamado em breve.
        </p>
        <button
          className="fd-btn fd-btn-danger fd-btn-sm"
          disabled={exitState === "loading"}
          onClick={async () => {
            setExitState("loading");
            await exitQueueAnon(commerce.id, anonymousId);
            setState("idle");
            setPosition(null);
            setExitState("idle");
          }}
        >
          {exitState === "loading" ? "Saindo..." : "Sair da fila"}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div>
        <h1 className="page-title">{commerce.name}</h1>
        {commerce.description && (
          <p className="page-subtitle">{commerce.description}</p>
        )}
      </div>

      {(commerce.open_at || commerce.closed_at) && (
        <p style={{ fontSize: "0.85rem", color: "var(--text-3)" }}>
          Horário: {commerce.open_at} — {commerce.closed_at}
        </p>
      )}

      {queue ? (
        <>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span
              className={`queue-status-badge ${queue.status === "open" ? "open" : "closed"}`}
            >
              Fila {queue.status === "open" ? "aberta" : "fechada"}
            </span>
            {queue.name && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
                {queue.name}
              </span>
            )}
          </div>

          {queue.status !== "open" ? (
            <p style={{ fontSize: "0.875rem", color: "var(--text-3)" }}>
              A fila está fechada no momento.
            </p>
          ) : (
            <>
              {error && <div className="fd-alert-error">{error}</div>}
              <button
                className="fd-btn fd-btn-primary"
                onClick={handleEnter}
                disabled={state === "loading" || !anonymousId}
                style={{ width: "100%" }}
              >
                {state === "loading" ? "Entrando..." : "Entrar na fila"}
              </button>
            </>
          )}
        </>
      ) : (
        <p style={{ fontSize: "0.875rem", color: "var(--text-3)" }}>
          Este comércio não tem uma fila ativa.
        </p>
      )}
    </div>
  );
}
