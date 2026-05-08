"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MagicLinkPage() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = new URL(value.trim());
      const commerceId = url.searchParams.get("commerceId");
      const token = url.searchParams.get("token");
      if (commerceId && token) {
        router.push(
          `/entrar-fila?commerceId=${encodeURIComponent(commerceId)}&token=${encodeURIComponent(token)}&mode=magic-link`
        );
        return;
      }
    } catch {
      // Not a URL — fall through
    }

    setError(
      "Link inválido. Certifique-se de colar o link completo enviado pelo comércio."
    );
  };

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Link mágico</h1>
          <p className="page-subtitle">
            Cole o link que o comércio enviou para você por WhatsApp, e-mail ou
            SMS.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div className="fd-field">
          <label className="fd-label" htmlFor="link">
            Link
          </label>
          <input
            id="link"
            className="fd-input"
            placeholder="https://filadigital.app.br/entrar-fila?..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        {error && (
          <p style={{ fontSize: "0.8rem", color: "var(--error)" }}>{error}</p>
        )}

        <button
          type="submit"
          className="fd-btn fd-btn-primary"
          disabled={!value.trim()}
        >
          Continuar
        </button>
      </form>
    </div>
  );
}
