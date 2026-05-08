"use client";

import { useState } from "react";
import Link from "next/link";
import { NearbyCommerce } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

const CEP_CACHE_KEY = "fd:cep_prefix";
const CEP_CACHE_TTL = 24 * 60 * 60 * 1000;

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

const timeAgo = (isoDate: string): string => {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (diff < 1) return "agora mesmo";
  if (diff < 60) return `há ${diff} min`;
  const h = Math.floor(diff / 60);
  return `há ${h}h${diff % 60 > 0 ? ` ${diff % 60}min` : ""}`;
};

const waitLabel = (count: number): string => {
  if (count === 0) return "Sem espera";
  return `~${count * 5} min de espera`;
};

function CommerceCard({ commerce }: { commerce: NearbyCommerce }) {
  return (
    <Link
      href={`/entrar-fila?commerceId=${commerce.commerce_id}&mode=search`}
      className="commerce-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="commerce-card-header">
        <span className="commerce-card-name">{commerce.name}</span>
        <span
          className="queue-status-badge open"
          style={{ fontSize: "0.7rem" }}
        >
          aberta
        </span>
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
        <span>{waitLabel(Number(commerce.participants_waiting))}</span>
      </div>

      <span
        className="fd-btn fd-btn-primary fd-btn-sm"
        style={{ marginTop: "0.25rem", textAlign: "center" }}
      >
        Entrar na fila
      </span>
    </Link>
  );
}

type GeoState = "idle" | "loading" | "done" | "denied" | "error";

export default function SearchQueuePage() {
  const [name, setName] = useState("");
  const [cepPrefix, setCepPrefix] = useState<string | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [results, setResults] = useState<NearbyCommerce[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const cached = getCachedPrefix();
        if (cached) {
          setCepPrefix(cached);
          setGeoState("done");
          return;
        }
        const prefix = await reverseGeocode(coords.latitude, coords.longitude);
        if (!prefix) {
          setGeoState("error");
          return;
        }
        cachePrefix(prefix);
        setCepPrefix(prefix);
        setGeoState("done");
      },
      () => setGeoState("denied")
    );
  };

  const search = async () => {
    if (!name.trim() && !cepPrefix) {
      setSearchError(
        "Ative a localização ou digite o nome de um comércio para buscar."
      );
      return;
    }
    setSearchError(null);
    setSearched(true);

    const params = new URLSearchParams();
    if (cepPrefix) params.set("cepPrefix", cepPrefix);
    if (name.trim()) params.set("name", name.trim());

    try {
      const res = await fetch(`${BASE_URL}/v1/procurar-fila?${params}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as NearbyCommerce[];
      setResults(data);
    } catch {
      setSearchError("Erro ao buscar filas. Tente novamente.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Procurar Fila</h1>
          <p className="page-subtitle">
            Encontre filas abertas perto de você ou pelo nome do comércio
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            className="fd-btn fd-btn-ghost fd-btn-sm"
            onClick={requestLocation}
            disabled={geoState === "loading" || geoState === "done"}
            style={{ whiteSpace: "nowrap" }}
          >
            {geoState === "idle" && "📍 Usar minha localização"}
            {geoState === "loading" && "Detectando..."}
            {geoState === "done" && "✓ Localização ativada"}
            {geoState === "denied" && "Localização negada"}
            {geoState === "error" && "Não foi possível detectar"}
          </button>
          {geoState === "done" && (
            <button
              className="fd-btn fd-btn-ghost fd-btn-sm"
              onClick={() => {
                setCepPrefix(null);
                setGeoState("idle");
              }}
              style={{ fontSize: "0.75rem" }}
            >
              Remover
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input
            type="text"
            className="fd-input"
            placeholder="Nome do comércio..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            style={{ flex: 1 }}
          />
          <button className="fd-btn fd-btn-primary" onClick={search}>
            Buscar
          </button>
        </div>

        {searchError && (
          <p style={{ fontSize: "0.8rem", color: "var(--error)" }}>
            {searchError}
          </p>
        )}
      </div>

      {searched && results.length === 0 && !searchError && (
        <div className="empty-state">
          <p className="empty-state-text">
            Nenhuma fila encontrada. Tente outro nome ou região.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="dash-grid-2 section-gap">
          {results.map((commerce) => (
            <CommerceCard key={commerce.queue_id} commerce={commerce} />
          ))}
        </div>
      )}
    </div>
  );
}
