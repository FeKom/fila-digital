"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NearbyCommerce } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

type Status = "requesting" | "loading" | "done" | "geo-denied" | "error";

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export default function NearbyQueuesPage() {
  const [status, setStatus] = useState<Status>("requesting");
  const [results, setResults] = useState<NearbyCommerce[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("geo-denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setStatus("loading");
        try {
          const params = new URLSearchParams({
            lat: String(coords.latitude),
            lng: String(coords.longitude),
            radius: "5000",
          });
          const res = await fetch(
            `${BASE_URL}/v1/commerce/nearby?${params.toString()}`
          );
          if (!res.ok) throw new Error();
          const data = (await res.json()) as NearbyCommerce[];
          setResults(data);
          setStatus("done");
        } catch {
          setStatus("error");
        }
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
            Comércios com filas abertas num raio de 5 km
          </p>
        </div>
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
            Nenhuma fila aberta encontrada num raio de 5 km.
          </p>
        </div>
      )}

      {status === "done" && results.length > 0 && (
        <div className="dash-grid-2 section-gap">
          {results.map((commerce) => (
            <Link
              key={commerce.id}
              href={`/comercio/${commerce.id}`}
              className="commerce-card"
              style={{ textDecoration: "none" }}
            >
              <div className="commerce-card-header">
                <span className="commerce-card-name">{commerce.name}</span>
                <span
                  className="queue-status-badge open"
                  style={{ fontSize: "0.7rem" }}
                >
                  {commerce.open_queues_count}{" "}
                  {Number(commerce.open_queues_count) === 1 ? "fila" : "filas"}
                </span>
              </div>
              {commerce.description && (
                <p className="commerce-card-desc">{commerce.description}</p>
              )}
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "0.5rem",
                }}
              >
                📍 {formatDistance(commerce.distance_meters)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
