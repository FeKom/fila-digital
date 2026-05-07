"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { enterQueue } from "./actions";
import { Participant } from "@/types";
import { getAnonymousId } from "@/lib/anonymousId";

function QrEntryPage({ queueId, token }: { queueId: string; token: string }) {
  const [result, setResult] = useState<{
    participant?: Participant;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [anonymousId, setAnonymousId] = useState("");

  useEffect(() => {
    setAnonymousId(getAnonymousId());
  }, []);

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
          <input type="hidden" name="queueId" value={queueId} />
          <input type="hidden" name="qrcodeToken" value={token} />
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

function RedirectToProcurarFila() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/procurar-fila");
  }, [router]);
  return null;
}

export default function EnterQueuePage() {
  const searchParams = useSearchParams();
  const queueId = searchParams.get("queueId") ?? "";
  const token = searchParams.get("token") ?? "";

  if (queueId && token) {
    return <QrEntryPage queueId={queueId} token={token} />;
  }

  return <RedirectToProcurarFila />;
}
