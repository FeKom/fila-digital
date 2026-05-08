"use client";
import { useState } from "react";

type Props = {
  defaultLat?: number | null;
  defaultLng?: number | null;
};

const GEO_ERRORS: Record<number, string> = {
  1: "Permissão negada — ative a localização no navegador",
  2: "Localização indisponível — verifique o GPS ou a rede",
  3: "Tempo esgotado — tente novamente",
};

const LocationButton = ({ defaultLat, defaultLng }: Props) => {
  // Postgres decimal columns come back as strings over JSON — coerce to number.
  const parsedLat = defaultLat != null ? Number(defaultLat) : null;
  const parsedLng = defaultLng != null ? Number(defaultLng) : null;

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    parsedLat != null && parsedLng != null ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(parsedLat);
  const [lng, setLng] = useState<number | null>(parsedLng);

  const handleClick = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocalização não suportada neste navegador");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setStatus("done");
      },
      (err) => {
        setErrorMsg(GEO_ERRORS[err.code] ?? "Erro desconhecido");
        setStatus("error");
      }
    );
  };

  return (
    <div className="fd-field">
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />
      <button
        type="button"
        className={`fd-btn ${status === "done" ? "fd-btn-ghost" : "fd-btn-primary"} fd-btn-sm`}
        onClick={handleClick}
        disabled={status === "loading"}
      >
        {status === "loading" && "Obtendo localização..."}
        {status === "done" && "✓ Localização salva"}
        {status === "error" && "Erro — tentar novamente"}
        {status === "idle" && "Usar minha localização"}
      </button>
      {status === "error" && errorMsg && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--error)",
            marginTop: "0.25rem",
          }}
        >
          {errorMsg}
        </p>
      )}
      {status === "done" && lat !== null && lng !== null && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "0.25rem",
          }}
        >
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default LocationButton;
