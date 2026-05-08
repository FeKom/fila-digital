import { getQueue, updateQueue } from "@/domains/queue/queue.actions";

type Props = {
  params: Promise<{ commerce_id: string; queue_id: string }>;
};

const EditQueue = async ({ params }: Props) => {
  const { commerce_id, queue_id } = await params;
  const queue = await getQueue(commerce_id, queue_id);

  const handleUpdate = async (formData: FormData) => {
    "use server";
    await updateQueue(commerce_id, queue_id, formData);
  };

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Fila</h1>
          <p className="page-subtitle">Atualize as configurações da sua fila</p>
        </div>
      </div>

      <form action={handleUpdate}>
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
              defaultValue={queue.name}
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
              defaultValue={queue.description}
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
                defaultValue={queue.type}
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
                defaultValue={queue.status}
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
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditQueue;
