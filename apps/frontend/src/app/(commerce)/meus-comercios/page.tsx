import Link from "next/link";
import { getUserCommerces } from "@/domains/commerce/commerce.actions";
import { getUserQueues } from "@/domains/queue/queue.actions";
import { CommerceCard } from "@/domains/commerce/components/CommerceCard";
import { QueuePositionCard } from "@/domains/queue/components/QueuePositionCard";
import { EmptyState } from "@/components/EmptyState";

export default async function MeusComerciosPage() {
  const [commerces, queues] = await Promise.all([
    getUserCommerces(),
    getUserQueues(),
  ]);

  return (
    <div className="page-container">
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
