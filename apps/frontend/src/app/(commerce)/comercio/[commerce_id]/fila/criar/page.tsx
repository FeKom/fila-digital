import { createQueue } from "@/domains/queue/queue.actions";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CreateQueue = async ({ params }: Props) => {
  const { commerce_id } = await params;

  const handleCreate = async (formData: FormData) => {
    "use server";
    await createQueue(commerce_id, formData);
    redirect(`/comercio/${commerce_id}`);
  };

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Criar Fila</h1>
          <p className="page-subtitle">Configure a fila para o seu comércio</p>
        </div>
      </div>

      <form action={handleCreate}>
        <div className="form-section">
          <div className="form-section-title">Informações da fila</div>
          <div className="fd-field" style={{ marginBottom: "1rem" }}>
            <label className="fd-label" htmlFor="name">
              Nome da Fila
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Fila Principal"
              className="fd-input"
            />
          </div>
          <div className="fd-field">
            <label className="fd-label" htmlFor="description">
              Descrição
            </label>
            <input
              id="description"
              name="description"
              type="text"
              placeholder="Descreva a fila"
              className="fd-input"
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Configurações</div>
          <div className="form-grid-2">
            <div className="fd-field">
              <label className="fd-label" htmlFor="type">
                Tipo
              </label>
              <select
                id="type"
                name="type"
                defaultValue="permanent"
                className="fd-select"
              >
                <option value="permanent">Permanente</option>
                <option value="ephemera">Temporária</option>
              </select>
            </div>
            <div className="fd-field">
              <label className="fd-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="open"
                className="fd-select"
              >
                <option value="open">Aberta</option>
                <option value="closed">Fechada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="fd-btn fd-btn-primary">
            Criar Fila
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQueue;
