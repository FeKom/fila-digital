import Link from "next/link";
import { getUserCommerces, getUserQueues, isAuthenticated } from "./actions";
import { CommerceCard } from "@/components/CommerceCard";
import { QueuePositionCard } from "@/components/QueuePositionCard";
import { EmptyState } from "@/components/EmptyState";

export default async function Home() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8 text-center">
        <h1 className="text-4xl font-bold">Fila Digital</h1>
        <p className="text-xl text-gray-500 max-w-md">
          Gerencie filas do seu comercio ou entre em uma fila sem sair do lugar.
        </p>
        <div className="flex gap-4">
          <Link href="/login" className="btn btn-primary rounded-field">
            Entrar
          </Link>
          <Link href="/registrar" className="btn btn-secondary rounded-field">
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
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Meus Comercios</h2>
          <Link
            href="/comercio/criar"
            className="btn btn-primary btn-sm rounded-field"
          >
            + Novo Comercio
          </Link>
        </div>
        {commerces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {commerces.map((commerce) => (
              <CommerceCard key={commerce.id} commerce={commerce} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🏪"
            message="Voce ainda nao tem comercios cadastrados."
            ctaLabel="Cadastrar comercio"
            ctaHref="/comercio/criar"
          />
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Minhas Filas</h2>
        {queues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {queues.map((queue) => (
              <QueuePositionCard key={queue.queue_id} queue={queue} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📋"
            message="Voce nao esta em nenhuma fila no momento."
            ctaLabel="Entrar em uma fila"
            ctaHref="/entrar-fila"
          />
        )}
      </section>
    </div>
  );
}
