"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import commerceService from "@/services/commerce";
import participantService from "@/services/participant";
import { Commerce } from "@/types";

type EnterState = "idle" | "loading" | "done" | "error" | "closed";

export default function MagicLinkPage() {
  const { commerce_id } = useParams<{ commerce_id: string }>();
  const [commerce, setCommerce] = useState<Commerce | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [enterState, setEnterState] = useState<EnterState>("idle");

  useEffect(() => {
    commerceService()
      .getById(commerce_id)
      .then((c) => {
        setCommerce(c);
        if (!c.queue || c.queue.status !== "open") setEnterState("closed");
      })
      .catch(() => setLoadError(true));
  }, [commerce_id]);

  const handleEnter = async () => {
    setEnterState("loading");
    try {
      const anonymousId = crypto.randomUUID();
      await participantService().enterPublic(commerce_id, anonymousId);
      // Reload to get updated participant count / position
      setEnterState("done");
    } catch {
      setEnterState("error");
    }
  };

  if (loadError) {
    return (
      <div className="page-container-sm">
        <div className="empty-state">
          <p className="empty-state-text">Comércio não encontrado.</p>
        </div>
      </div>
    );
  }

  if (!commerce) {
    return (
      <div className="page-container-sm">
        <div className="empty-state">
          <p className="empty-state-text">Carregando...</p>
        </div>
      </div>
    );
  }

  if (enterState === "done") {
    return (
      <div className="page-container-sm">
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
          <h1 className="page-title" style={{ textAlign: "center" }}>
            Você entrou na fila!
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-2)" }}>
            {commerce.name}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>
            Aguarde sua vez. Você será chamado em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-sm">
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div>
          <h1 className="page-title">{commerce.name}</h1>
          {commerce.description && (
            <p className="page-subtitle">{commerce.description}</p>
          )}
        </div>

        {commerce.queue && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span
              className={`queue-status-badge ${commerce.queue.status === "open" ? "open" : "closed"}`}
            >
              {commerce.queue.status === "open"
                ? "Fila aberta"
                : "Fila fechada"}
            </span>
          </div>
        )}

        {(commerce.open_at || commerce.closed_at) && (
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Horário: {commerce.open_at} — {commerce.closed_at}
          </p>
        )}

        {enterState === "closed" && (
          <div className="empty-state">
            <p className="empty-state-text">
              A fila deste comércio está fechada no momento.
            </p>
          </div>
        )}

        {enterState === "error" && (
          <p style={{ fontSize: "0.875rem", color: "var(--error)" }}>
            Erro ao entrar na fila. Tente novamente.
          </p>
        )}

        {enterState !== "closed" && (
          <button
            className="fd-btn fd-btn-primary"
            onClick={handleEnter}
            disabled={enterState === "loading"}
            style={{ width: "100%" }}
          >
            {enterState === "loading" ? "Entrando..." : "Entrar na fila"}
          </button>
        )}
      </div>
    </div>
  );
}
