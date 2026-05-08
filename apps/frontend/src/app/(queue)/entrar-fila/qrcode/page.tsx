"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QrCodePage() {
  const [commerceId, setCommerceId] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commerceId.trim() || !token.trim()) return;
    router.push(
      `/entrar-fila?commerceId=${encodeURIComponent(commerceId.trim())}&token=${encodeURIComponent(token.trim())}&mode=qrcode`
    );
  };

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Code</h1>
          <p className="page-subtitle">
            Escaneie o QR Code com a câmera do celular. Se preferir, insira os
            dados manualmente.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div className="fd-field">
          <label className="fd-label" htmlFor="commerceId">
            ID do comércio
          </label>
          <input
            id="commerceId"
            className="fd-input"
            placeholder="ID do comércio"
            value={commerceId}
            onChange={(e) => setCommerceId(e.target.value)}
          />
        </div>
        <div className="fd-field">
          <label className="fd-label" htmlFor="token">
            Token do QR Code
          </label>
          <input
            id="token"
            className="fd-input"
            placeholder="Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="fd-btn fd-btn-primary"
          disabled={!commerceId.trim() || !token.trim()}
        >
          Continuar
        </button>
      </form>
    </div>
  );
}
