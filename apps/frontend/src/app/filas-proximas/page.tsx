"use client";
import { useEffect, useRef, useState } from "react";
import { NearbyCommerce } from "@/types";
const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

const CEP_CACHE_KEY = "fd:cep_prefix";
const CEP_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

type Status = "requesting" | "loading" | "done" | "geo-denied" | "error";
type EnterState = "idle" | "loading" | "done" | "error";

// ── localStorage helpers ────────────────────────────────────────────────────

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

// ── Geo helpers ─────────────────────────────────────────────────────────────

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
    return postcode.replace(/\D/g, "").slice(0, 4); // first 4 digits
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

// ── Card ────────────────────────────────────────────────────────────────────

const mapsUrl = (
  lat: number | null | undefined,
  lng: number | null | undefined
) =>
  lat != null && lng != null
    ? `https://maps.google.com/?q=${lat},${lng}`
    : null;

function CommerceCard({ commerce }: { commerce: NearbyCommerce }) {
  const [enterState, setEnterState] = useState<EnterState>("idle");
  const map = mapsUrl(commerce.latitude, commerce.longitude);

  const handleEnter = async () => {
    setEnterState("loading");
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
      setEnterState("done");
    } catch {
      setEnterState("error");
    }
  };

  return (
    <div
      className="commerce-card"
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      <div className="commerce-card-header">
        <span className="commerce-card-name">{commerce.name}</span>
        <span
          className="queue-status-badge open"
          style={{ fontSize: "0.7rem" }}
        >
          fila aberta
        </span>
      </div>

      {commerce.description && (
        <p className="commerce-card-desc">{commerce.description}</p>
      )}

      {map && (
        <a
          href={map}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.8rem",
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          📍 Ver no mapa
        </a>
      )}

      <button
        className={`fd-btn fd-btn-sm ${enterState === "done" ? "fd-btn-ghost" : "fd-btn-primary"}`}
        style={{ marginTop: "0.25rem" }}
        onClick={handleEnter}
        disabled={enterState === "loading" || enterState === "done"}
      >
        {enterState === "idle" && "Entrar"}
        {enterState === "loading" && "Entrando..."}
        {enterState === "done" && "✓ Na fila!"}
        {enterState === "error" && "Erro — tentar novamente"}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NearbyQueuesPage() {
  const [cepPrefix, setCepPrefix] = useState<string | null>(() =>
    getCachedPrefix()
  );
  const [status, setStatus] = useState<Status>(() =>
    getCachedPrefix() ? "loading" : "requesting"
  );
  const [results, setResults] = useState<NearbyCommerce[]>([]);
  const initialPrefix = useRef(cepPrefix);

  useEffect(() => {
    // Fast path: cached prefix available → skip GPS entirely
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

    // Slow path: ask for GPS → reverse geocode → extract 4-digit CEP prefix
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

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Filas próximas</h1>
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
      {status === "done" && results.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-text">
            Nenhuma fila aberta encontrada na sua região.
          </p>
        </div>
      )}
      {status === "done" && results.length > 0 && (
        <div className="dash-grid-2 section-gap">
          {results.map((commerce) => (
            <CommerceCard key={commerce.queue_id} commerce={commerce} />
          ))}
        </div>
      )}
    </div>
  );
}
