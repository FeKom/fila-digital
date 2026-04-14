import { getUserQueues, exitQueue } from "./actions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components";

const MyQueues = async () => {
  const queues = await getUserQueues();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Minhas Filas</h1>

      {queues.length === 0 ? (
        <EmptyState
          icon="📋"
          message="Voce nao esta em nenhuma fila no momento."
          ctaLabel="Entrar em uma fila"
          ctaHref="/entrar-fila"
        />
      ) : (
        <div className="space-y-4">
          {queues.map((queue) => {
            const exitAction = async () => {
              "use server";
              await exitQueue(queue.commerce_id);
            };

            return (
              <div
                key={queue.queue_id}
                className="card bg-base-100 shadow-md border border-base-200"
              >
                <div className="card-body p-5 flex-row items-center justify-between">
                  <div>
                    <h3 className="card-title text-lg">{queue.queue_name}</h3>
                    <p className="text-sm text-gray-500">
                      {queue.commerce_name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge badge-primary badge-lg text-lg font-bold">
                        #{queue.position}
                      </span>
                      <span className="text-sm text-gray-400">na fila</span>
                    </div>
                  </div>
                  <form action={exitAction}>
                    <Button
                      type="submit"
                      intent="error"
                      variant="outline"
                      className="btn-sm"
                    >
                      Sair da fila
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyQueues;
