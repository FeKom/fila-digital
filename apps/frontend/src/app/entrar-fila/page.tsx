"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { enterQueue } from "./actions";
import { Participant } from "@/types";

const EnterQueue = () => {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<{
    participant?: Participant;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [anonymousId] = useState(() => crypto.randomUUID());

  const prefilledQueueId = searchParams.get("queueId") ?? "";
  const prefilledToken = searchParams.get("token") ?? "";
  const hasQrParams = Boolean(prefilledQueueId && prefilledToken);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    const response = await enterQueue(formData);
    setResult(response);
    setLoading(false);
  };

  if (result?.participant) {
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
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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
              #{result.participant.position}
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-2)" }}>
            Aguarde sua vez. Você será chamado em breve.
          </p>
          {result.participant.position > 1 && (
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-3)",
                background: "var(--bg-surface-2)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
              }}
            >
              Tempo estimado:{" "}
              <strong>~{result.participant.position * 5} minutos</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  // QR code scan flow — show a single button, no manual inputs
  if (hasQrParams) {
    return (
      <div className="page-container-sm">
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "2.5rem 2rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "var(--bg-surface-2)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                stroke="var(--text-2)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="page-title" style={{ textAlign: "center" }}>
              Entrar na Fila
            </h1>
            <p className="page-subtitle" style={{ textAlign: "center" }}>
              Toque no botão abaixo para garantir sua vaga.
            </p>
          </div>

          {result?.error && (
            <div className="fd-alert-error" style={{ width: "100%" }}>
              {result.error}
            </div>
          )}

          <form action={handleSubmit} style={{ width: "100%" }}>
            <input type="hidden" name="queueId" value={prefilledQueueId} />
            <input type="hidden" name="qrcodeToken" value={prefilledToken} />
            <input type="hidden" name="anonymousId" value={anonymousId} />
            <button
              type="submit"
              className="fd-btn fd-btn-primary"
              disabled={loading}
              style={{ width: "100%", fontSize: "1rem", padding: "0.9rem" }}
            >
              {loading ? "Entrando..." : "Entrar na Fila"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Manual entry flow — show full form
  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Entrar na Fila</h1>
          <p className="page-subtitle">
            Insira os dados do QR Code para entrar na fila.
          </p>
        </div>
      </div>

      {result?.error && (
        <div className="fd-alert-error" style={{ marginBottom: "1.25rem" }}>
          {result.error}
        </div>
      )}

      <form action={handleSubmit}>
        <div className="form-section">
          <div className="form-section-title">Dados da fila</div>
          <div className="fd-field" style={{ marginBottom: "1rem" }}>
            <label className="fd-label" htmlFor="queueId">
              ID da Fila
            </label>
            <input
              id="queueId"
              name="queueId"
              type="text"
              placeholder="ID da fila"
              className="fd-input"
            />
          </div>
          <div className="fd-field" style={{ marginBottom: "1rem" }}>
            <label className="fd-label" htmlFor="qrcodeToken">
              Token do QR Code
            </label>
            <input
              id="qrcodeToken"
              name="qrcodeToken"
              type="text"
              placeholder="Token"
              className="fd-input"
            />
          </div>
          <div className="fd-field">
            <label className="fd-label" htmlFor="userId">
              ID de Usuário (opcional)
            </label>
            <input
              id="userId"
              name="userId"
              type="text"
              placeholder="Deixe vazio para entrar como anônimo"
              className="fd-input"
            />
          </div>
        </div>

        <input type="hidden" name="anonymousId" value={anonymousId} />

        <div className="form-actions">
          <button
            type="submit"
            className="fd-btn fd-btn-primary"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar na Fila"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnterQueue;
