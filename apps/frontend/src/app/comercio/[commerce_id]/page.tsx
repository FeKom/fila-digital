import Link from "next/link";
import {
  getCommerce,
  getParticipants,
  deleteCommerce,
  callNextParticipant,
} from "./actions";
import { Badge } from "@/components/Badge";
import { ParticipantList } from "@/components/ParticipantList";
import { Button } from "@/components";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CommerceDetail = async ({ params }: Props) => {
  const { commerce_id } = await params;
  const [commerce, participants] = await Promise.all([
    getCommerce(commerce_id),
    getParticipants(commerce_id),
  ]);

  const deleteAction = async () => {
    "use server";
    await deleteCommerce(commerce_id);
  };

  const callNextAction = async () => {
    "use server";
    await callNextParticipant(commerce_id);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{commerce.name}</h1>
          {commerce.description && (
            <p className="text-gray-500 mt-1">{commerce.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/comercio/${commerce_id}/editar`}
            className="btn btn-outline btn-sm rounded-field"
          >
            Editar
          </Link>
          <form action={deleteAction}>
            <Button
              type="submit"
              intent="error"
              variant="outline"
              className="btn-sm"
            >
              Excluir
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-base-100 shadow border border-base-200 p-4">
          <p className="text-sm text-gray-400">Telefone</p>
          <p className="font-semibold">{commerce.phone}</p>
        </div>
        <div className="card bg-base-100 shadow border border-base-200 p-4">
          <p className="text-sm text-gray-400">CNPJ</p>
          <p className="font-semibold">{commerce.document_id}</p>
        </div>
        <div className="card bg-base-100 shadow border border-base-200 p-4">
          <p className="text-sm text-gray-400">Horario</p>
          <p className="font-semibold">
            {commerce.open_at} - {commerce.closed_at}
          </p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Fila</h2>
            {commerce.queue ? (
              <Badge
                variant={commerce.queue.status === "open" ? "success" : "error"}
              >
                {commerce.queue.status === "open" ? "Aberta" : "Fechada"}
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            {commerce.queue ? (
              <Link
                href={`/comercio/${commerce_id}/fila/${commerce.queue.id}/editar`}
                className="btn btn-outline btn-sm rounded-field"
              >
                Editar Fila
              </Link>
            ) : (
              <Link
                href={`/comercio/${commerce_id}/fila/criar`}
                className="btn btn-primary btn-sm rounded-field"
              >
                Criar Fila
              </Link>
            )}
          </div>
        </div>

        {commerce.queue ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <form action={callNextAction}>
                <Button type="submit" intent="secondary" className="btn-sm">
                  Chamar Proximo
                </Button>
              </form>
              <span className="text-sm text-gray-400">
                {participants.length} participante(s) na fila
              </span>
            </div>
            <ParticipantList participants={participants} />
          </>
        ) : (
          <p className="text-gray-500 text-center py-6">
            Este comercio ainda nao tem uma fila. Crie uma para comecar.
          </p>
        )}
      </section>
    </div>
  );
};

export default CommerceDetail;
