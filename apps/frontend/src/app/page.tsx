import Link from "next/link";
import { getUserCommerces, getUserQueues, isAuthenticated } from "./actions";
import { CommerceCard } from "@/components/CommerceCard";
import { QueuePositionCard } from "@/components/QueuePositionCard";
import { EmptyState } from "@/components/EmptyState";

export default async function Home() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return (
      <div className="landing-hero">
        <div className="landing-bg">
          <div className="landing-bg-grid" />
          <div className="landing-bg-glow" />
        </div>

        <span className="landing-eyebrow">
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "var(--primary)",
              display: "inline-block",
              animation: "logoPulse 2s ease-in-out infinite",
            }}
          />
          Sistema de filas
        </span>

        <h1 className="landing-title">
          Filas sem
          <br />
          <span>sufoco.</span>
        </h1>

        <p className="landing-desc">
          Gerencie filas do seu comércio ou entre em uma fila de qualquer lugar.
        </p>

        <div className="landing-ctas">
          <Link href="/login" className="fd-btn fd-btn-primary fd-btn-lg">
            Entrar
          </Link>
          <Link href="/registrar" className="fd-btn fd-btn-ghost fd-btn-lg">
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  const [commerces, queues] = await Promise.all([
    getUserCommerces(),
    getUserQueues(),
  ]);

  return (
    <div className="page-container">
      {/* Commerces section */}
      <div className="section-header">
        <h2 className="section-label" style={{ margin: 0 }}>
          Meus Comércios
        </h2>
        <Link
          href="/comercio/criar"
          className="fd-btn fd-btn-primary fd-btn-sm"
        >
          + Novo
        </Link>
      </div>

      {commerces.length > 0 ? (
        <div className="dash-grid-2 section-gap">
          {commerces.map((commerce) => (
            <CommerceCard key={commerce.id} commerce={commerce} />
          ))}
        </div>
      ) : (
        <div className="section-gap">
          <EmptyState
            message="Você ainda não tem comércios cadastrados."
            ctaLabel="Cadastrar comércio"
            ctaHref="/comercio/criar"
          />
        </div>
      )}

      {/* Queues section */}
      <div className="section-header section-top">
        <h2 className="section-label" style={{ margin: 0 }}>
          Minhas Posições
        </h2>
      </div>

      {queues.length > 0 ? (
        <div className="dash-grid-2">
          {queues.map((queue) => (
            <QueuePositionCard key={queue.queue_id} queue={queue} />
          ))}
        </div>
      ) : (
        <EmptyState
          message="Você não está em nenhuma fila no momento."
          ctaLabel="Entrar em uma fila"
          ctaHref="/entrar-fila"
        />
      )}
    </div>
  );
}
