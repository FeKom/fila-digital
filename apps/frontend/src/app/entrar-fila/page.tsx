"use client";

import { useState } from "react";
import { enterQueue } from "./actions";
import { Participant } from "@/types";

const EnterQueue = () => {
  const [result, setResult] = useState<{
    participant?: Participant;
    error?: string;
  } | null>(null);
  const [anonymousId] = useState(() => crypto.randomUUID());

  const handleSubmit = async (formData: FormData) => {
    const response = await enterQueue(formData);
    setResult(response);
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
        </div>
      </div>
    );
  }

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
          <button type="submit" className="fd-btn fd-btn-primary">
            Entrar na Fila
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnterQueue;
