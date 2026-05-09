import { getCommerce } from "@/domains/commerce/commerce.actions";
import CreateQueueForm from "./CreateQueueForm";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CreateQueue = async ({ params }: Props) => {
  const { commerce_id } = await params;
  const commerce = await getCommerce(commerce_id);

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Criar Fila</h1>
          <p className="page-subtitle">Configure a fila para o seu comércio</p>
        </div>
      </div>
      <CreateQueueForm
        commerceId={commerce_id}
        commerceOpenAt={commerce?.open_at ?? undefined}
      />
    </div>
  );
};

export default CreateQueue;
