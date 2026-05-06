"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { enterQueue } from "./actions";
import { Participant } from "@/types";

// ── QR / magic-link entry flow ────────────────────────────────────────────────

function QrEntryPage({ queueId, token }: { queueId: string; token: string }) {
  const [result, setResult] = useState<{
    participant?: Participant;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [anonymousId] = useState(() => crypto.randomUUID());

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

// ── Option card ───────────────────────────────────────────────────────────────

function OptionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1.25rem",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          background: "var(--bg-surface-2)",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--text-1)",
            marginBottom: "0.25rem",
          }}
        >
          {title}
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
          {description}
        </p>
      </div>
    </Link>
  );
}

// ── Landing — 3 ways to enter ─────────────────────────────────────────────────

function EntryLanding() {
  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Entrar na Fila</h1>
          <p className="page-subtitle">Escolha como quer entrar</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <OptionCard
          href="/entrar-fila/qrcode"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="3"
                width="8"
                height="8"
                rx="1.5"
                stroke="var(--text-2)"
                strokeWidth="1.5"
              />
              <rect
                x="13"
                y="3"
                width="8"
                height="8"
                rx="1.5"
                stroke="var(--text-2)"
                strokeWidth="1.5"
              />
              <rect
                x="3"
                y="13"
                width="8"
                height="8"
                rx="1.5"
                stroke="var(--text-2)"
                strokeWidth="1.5"
              />
              <path
                d="M13 13h2v2h-2zM17 13h4M17 17h4M13 17h2v4h-2"
                stroke="var(--text-2)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
          title="QR Code"
          description="Escaneie o QR Code do comércio para entrar na fila."
        />

        <OptionCard
          href="/entrar-fila/link"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                stroke="var(--text-2)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                stroke="var(--text-2)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="Link mágico"
          description="Recebeu um link do comércio? Cole o código aqui."
        />

        <OptionCard
          href="/procurar-fila"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="var(--text-2)"
                strokeWidth="1.5"
              />
              <path
                d="M20 20l-3-3"
                stroke="var(--text-2)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Procurar fila"
          description="Busque filas abertas perto de você ou pelo nome do comércio."
        />
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function EnterQueuePage() {
  const searchParams = useSearchParams();
  const queueId = searchParams.get("queueId") ?? "";
  const token = searchParams.get("token") ?? "";

  if (queueId && token) {
    return <QrEntryPage queueId={queueId} token={token} />;
  }

  return <EntryLanding />;
}
