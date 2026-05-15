import { getUserQueues } from "@/domains/queue/queue.actions";
import { EmptyState } from "@/components/EmptyState";
import { cookies } from "next/headers";
import QueueItem from "./QueueItem";

const MyQueues = async () => {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("digital_queue_jwt")?.value);

  if (!isLoggedIn) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Minhas Filas</h1>
        </div>
        <EmptyState
          message="Faça login para ver suas filas."
          ctaLabel="Entrar"
          ctaHref="/login"
        />
      </div>
    );
  }

  const queues = await getUserQueues();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Minhas Filas</h1>
      </div>

      {queues.length === 0 ? (
        <EmptyState
          message="Você não está em nenhuma fila no momento."
          ctaLabel="Entrar em uma fila"
          ctaHref="/entrar-fila"
        />
      ) : (
        <div className="queue-list">
          {queues.map((queue) => (
            <QueueItem key={queue.queue_id} queue={queue} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyQueues;
