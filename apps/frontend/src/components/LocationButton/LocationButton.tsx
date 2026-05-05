"use client";
import { useState } from "react";

type Props = {
  defaultLat?: number | null;
  defaultLng?: number | null;
};

const LocationButton = ({ defaultLat, defaultLng }: Props) => {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    defaultLat && defaultLng ? "done" : "idle"
  );
  const [lat, setLat] = useState<number | null>(defaultLat ?? null);
  const [lng, setLng] = useState<number | null>(defaultLng ?? null);

  const handleClick = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setStatus("done");
      },
      () => setStatus("error")
    );
  };

  return (
    <div className="fd-field">
      <label className="fd-label">Localização</label>
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />
      <button
        type="button"
        className={`fd-btn ${status === "done" ? "fd-btn-ghost" : "fd-btn-primary"} fd-btn-sm`}
        onClick={handleClick}
        disabled={status === "loading"}
      >
        {status === "loading" && "Obtendo localização..."}
        {status === "done" && `✓ Localização salva`}
        {status === "error" && "Erro — tentar novamente"}
        {status === "idle" && "Usar minha localização"}
      </button>
      {status === "done" && lat && lng && (
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
