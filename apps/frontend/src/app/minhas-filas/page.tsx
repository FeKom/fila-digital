import { getUserQueues, exitQueue } from "./actions";
import { EmptyState } from "@/components/EmptyState";

const MyQueues = async () => {
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
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {queues.map((queue) => {
            const exitAction = async () => {
              "use server";
              await exitQueue(queue.commerce_id);
            };

            return (
              <div
                key={queue.queue_id}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1.25rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "0.2rem",
                      color: "var(--text-1)",
                    }}
                  >
                    {queue.queue_name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-2)" }}>
                    {queue.commerce_name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.4rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <span className="queue-number" style={{ fontSize: "2rem" }}>
                      #{queue.position}
                    </span>
                    <span
                      style={{ fontSize: "0.78rem", color: "var(--text-3)" }}
                    >
                      na fila
                    </span>
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
