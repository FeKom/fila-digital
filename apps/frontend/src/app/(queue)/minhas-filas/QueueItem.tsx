"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import { exitQueue } from "@/domains/queue/queue.actions";
import { getAnonymousId } from "@/lib/anonymousId";
import { subscribeToPush, isPushSupported, isIOS } from "@/lib/push";
import type { UserQueue } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

type SSEMessage =
  | { position: number; queue_id: string }
  | { event: "exited"; queue_id: string };

// Suporte a push não muda durante a sessão — não há o que assinar.
// Referência estável para o React não reassinar a cada render.
const noopSubscribe = () => () => {};

const QueueItem = ({ queue: initialQueue }: { queue: UserQueue }) => {
  const [position, setPosition] = useState(initialQueue.position);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // isPushSupported() é síncrona e estável, mas retorna false no servidor
  // (checa `typeof window`). Ler via useSyncExternalStore mantém SSR e cliente
  // coerentes sem setState dentro de efeito, que forçava render em cascata.
  const pushSupported = useSyncExternalStore(
    noopSubscribe,
    isPushSupported,
    () => false
  );
  const [pushState, setPushState] = useState<"idle" | "subscribed">("idle");

  // Live position via SSE
  useEffect(() => {
    const anonId = getAnonymousId();
    const url = new URL(
      `/v1/participants-queue/${initialQueue.commerce_id}/stream`,
      BASE_URL
    );
    url.searchParams.set("anonymous_id", anonId);

    const es = new EventSource(url.toString(), { withCredentials: true });

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as SSEMessage;
        if ("position" in data) setPosition(data.position);
        if ("event" in data && data.event === "exited") es.close();
      } catch {
        // malformed frame — ignore
      }
    };

    return () => es.close();
  }, [initialQueue.commerce_id]);

  // Verifica se já existe inscrição. O setState aqui é assíncrono (dentro do
  // .then), então não dispara render em cascata na montagem.
  useEffect(() => {
    if (!pushSupported) return;

    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setPushState("subscribed");
      })
    );
  }, [pushSupported]);

  const handlePushSubscribe = async () => {
    const anonId = getAnonymousId();
    const ok = await subscribeToPush(anonId);
    if (ok) setPushState("subscribed");
  };

  const estimatedMinutes = position * 5;

  const handleExit = async () => {
    setLoading(true);
    setError(null);
    const result = await exitQueue(initialQueue.commerce_id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="queue-list-item">
      <div className="queue-list-item-info">
        <div className="queue-list-item-name">{initialQueue.queue_name}</div>
        <div className="queue-list-item-commerce">
          {initialQueue.commerce_name}
        </div>
        <div className="queue-list-item-position">
          <span className="queue-number queue-number-lg">#{position}</span>
          <span className="queue-list-item-position-label">na fila</span>
        </div>
        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-3)",
            marginTop: "0.25rem",
          }}
        >
          Tempo estimado: ~{estimatedMinutes} min
        </div>

        {/* Push notification opt-in — user gesture only, never auto-prompted */}
        {pushSupported && pushState === "idle" && (
          <button
            type="button"
            onClick={handlePushSubscribe}
            style={{
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "var(--primary)",
              background: "var(--primary-dim)",
              border: "1px solid var(--primary-glow)",
              borderRadius: "6px",
              padding: "0.35rem 0.75rem",
              cursor: "pointer",
            }}
          >
            🔔 Avisar quando for minha vez
          </button>
        )}
        {pushState === "subscribed" && (
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "var(--success)",
            }}
          >
            ✓ Você será notificado quando for chamado
          </p>
        )}
        {isIOS() && pushState !== "subscribed" && (
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.72rem",
              color: "var(--text-3)",
            }}
          >
            Para notificações no iOS, instale o app na tela inicial.
          </p>
        )}

        {error && (
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--error)",
              marginTop: "0.25rem",
            }}
          >
            {error}
          </div>
        )}
      </div>
      <button
        type="button"
        className="fd-btn fd-btn-danger fd-btn-sm"
        onClick={handleExit}
        disabled={loading}
      >
        {loading ? "Saindo..." : "Sair"}
      </button>
    </div>
  );
};

export default QueueItem;
