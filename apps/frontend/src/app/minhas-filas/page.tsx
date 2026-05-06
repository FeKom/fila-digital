import { getUserQueues, exitQueue } from "./actions";
import { EmptyState } from "@/components/EmptyState";
import { cookies } from "next/headers";

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
          {queues.map((queue) => {
            const exitAction = async () => {
              "use server";
              await exitQueue(queue.commerce_id);
            };

            const estimatedMinutes = queue.position * 5;

            return (
              <div key={queue.queue_id} className="queue-list-item">
                <div className="queue-list-item-info">
                  <div className="queue-list-item-name">{queue.queue_name}</div>
                  <div className="queue-list-item-commerce">
                    {queue.commerce_name}
                  </div>
                  <div className="queue-list-item-position">
                    <span className="queue-number queue-number-lg">
                      #{queue.position}
                    </span>
                    <span className="queue-list-item-position-label">
                      na fila
                    </span>
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
                </div>
                <form action={exitAction}>
                  <button
                    type="submit"
                    className="fd-btn fd-btn-danger fd-btn-sm"
                  >
                    Sair
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyQueues;
