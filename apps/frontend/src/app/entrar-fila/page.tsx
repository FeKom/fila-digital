"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { enterQueue } from "./actions";
import { NearbyCommerce, Participant } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

const CEP_CACHE_KEY = "fd:cep_prefix";
const CEP_CACHE_TTL = 24 * 60 * 60 * 1000;

// ── helpers ──────────────────────────────────────────────────────────────────

const getCachedPrefix = (): string | null => {
  try {
    const raw = localStorage.getItem(CEP_CACHE_KEY);
    if (!raw) return null;
    const { prefix, ts } = JSON.parse(raw) as { prefix: string; ts: number };
    if (Date.now() - ts > CEP_CACHE_TTL) {
      localStorage.removeItem(CEP_CACHE_KEY);
      return null;
    }
    return prefix;
  } catch {
    return null;
  }
};

const cachePrefix = (prefix: string) => {
  try {
    localStorage.setItem(
      CEP_CACHE_KEY,
      JSON.stringify({ prefix, ts: Date.now() })
    );
  } catch {}
};

const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "FilaDigital/1.0" } }
    );
    const data = (await res.json()) as { address?: { postcode?: string } };
    const postcode = data.address?.postcode;
    if (!postcode) return null;
    return postcode.replace(/\D/g, "").slice(0, 4);
  } catch {
    return null;
  }
};

const fetchNearby = async (cepPrefix: string): Promise<NearbyCommerce[]> => {
  const params = new URLSearchParams({ cepPrefix });
  const res = await fetch(`${BASE_URL}/v1/commerce/nearby?${params}`);
  if (!res.ok) throw new Error();
  return res.json() as Promise<NearbyCommerce[]>;
};

const timeAgo = (isoDate: string | null): string => {
  if (!isoDate) return "";
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (diff < 1) return "agora mesmo";
  if (diff < 60) return `há ${diff} min`;
  const h = Math.floor(diff / 60);
  return `há ${h}h${diff % 60 > 0 ? ` ${diff % 60}min` : ""}`;
};

const waitLabel = (count: number | string): string => {
  const n = Number(count);
  if (n === 0) return "Sem espera";
  return `~${n * 5} min de espera`;
};

// ── Commerce card ─────────────────────────────────────────────────────────────

type CardState = "idle" | "loading" | "done" | "error";

function CommerceCard({ commerce }: { commerce: NearbyCommerce }) {
  const [cardState, setCardState] = useState<CardState>("idle");
  const [position, setPosition] = useState<number | null>(null);

  const handleEnter = async () => {
    setCardState("loading");
    try {
      const anonymousId = crypto.randomUUID();
      const res = await fetch(
        `${BASE_URL}/v1/enter-queue/${commerce.commerce_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymousId }),
        }
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { data?: { position?: number } };
      setPosition(data.data?.position ?? null);
      setCardState("done");
    } catch {
      setCardState("error");
    }
  };

  if (cardState === "done") {
    return (
      <div
        className="commerce-card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            background: "var(--success-bg)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="var(--success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="commerce-card-name">{commerce.name}</span>
        <p style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
          Você entrou na fila!
        </p>
        {position !== null && (
          <span className="queue-number" style={{ fontSize: "2.5rem" }}>
            #{position}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="commerce-card"
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      <div className="commerce-card-header">
        <span className="commerce-card-name">{commerce.name}</span>
      </div>

      {commerce.description && (
        <p className="commerce-card-desc">{commerce.description}</p>
      )}

      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.75rem",
          color: "var(--text-3)",
        }}
      >
        <span>Aberta {timeAgo(commerce.created_at)}</span>
        <span>{waitLabel(commerce.participants_waiting)}</span>
      </div>

      {cardState === "error" && (
        <p style={{ fontSize: "0.75rem", color: "var(--error)" }}>
          Erro ao entrar. Tente novamente.
        </p>
      )}

      <button
        className="fd-btn fd-btn-primary fd-btn-sm"
        style={{ marginTop: "0.25rem" }}
        onClick={handleEnter}
        disabled={cardState === "loading"}
      >
        {cardState === "loading" ? "Entrando..." : "Entrar na fila"}
      </button>
    </div>
  );
}

// ── Discovery page ────────────────────────────────────────────────────────────

type GeoStatus = "requesting" | "loading" | "done" | "geo-denied" | "error";

function DiscoveryPage() {
  const [cepPrefix, setCepPrefix] = useState<string | null>(() =>
    getCachedPrefix()
  );
  const [status, setStatus] = useState<GeoStatus>(() =>
    getCachedPrefix() ? "loading" : "requesting"
  );
  const [results, setResults] = useState<NearbyCommerce[]>([]);
  const [search, setSearch] = useState("");
  const initialPrefix = useRef(cepPrefix);

  useEffect(() => {
    const cached = initialPrefix.current;
    if (cached) {
      fetchNearby(cached)
        .then((data) => {
          setResults(data);
          setStatus("done");
        })
        .catch(() => setStatus("error"));
      return;
    }

    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("geo-denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setStatus("loading");
        const prefix = await reverseGeocode(coords.latitude, coords.longitude);
        if (!prefix) {
          setStatus("error");
          return;
        }
        cachePrefix(prefix);
        setCepPrefix(prefix);
        fetchNearby(prefix)
          .then((data) => {
            setResults(data);
            setStatus("done");
          })
          .catch(() => setStatus("error"));
      },
      () => setStatus("geo-denied")
    );
  }, []);

  const filtered =
    search.trim() === ""
      ? results
      : results.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Entrar na Fila</h1>
          <p className="page-subtitle">
            Comércios com filas abertas na sua região
          </p>
        </div>
        {cepPrefix && (
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              alignSelf: "center",
            }}
          >
            Região {cepPrefix}xxxx
          </span>
        )}
      </div>

      {status === "done" && (
        <div style={{ marginBottom: "1.25rem" }}>
          <input
            type="text"
            className="fd-input"
            placeholder="Buscar por nome do comércio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {status === "requesting" && (
        <div className="empty-state">
          <p className="empty-state-text">
            Aguardando permissão de localização...
          </p>
        </div>
      )}
      {status === "loading" && (
        <div className="empty-state">
          <p className="empty-state-text">Buscando filas próximas...</p>
        </div>
      )}
      {status === "geo-denied" && (
        <div className="empty-state">
          <p className="empty-state-text">
            Permissão de localização negada. Ative a localização no navegador e
            recarregue a página.
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="empty-state">
          <p className="empty-state-text">
            Erro ao buscar filas. Tente novamente mais tarde.
          </p>
        </div>
      )}
      {status === "done" && filtered.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-text">
            {search
              ? "Nenhum comércio encontrado para essa busca."
              : "Nenhuma fila aberta encontrada na sua região."}
          </p>
        </div>
      )}
      {status === "done" && filtered.length > 0 && (
        <div className="dash-grid-2 section-gap">
          {filtered.map((commerce) => (
            <CommerceCard key={commerce.queue_id} commerce={commerce} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── QR code flow ──────────────────────────────────────────────────────────────

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

// ── Root ──────────────────────────────────────────────────────────────────────

export default function EnterQueuePage() {
  const searchParams = useSearchParams();
  const queueId = searchParams.get("queueId") ?? "";
  const token = searchParams.get("token") ?? "";

  if (queueId && token) {
    return <QrEntryPage queueId={queueId} token={token} />;
  }

  return <DiscoveryPage />;
}
