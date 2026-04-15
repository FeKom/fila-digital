import { getCommerce } from "../actions";
import { updateCommerce } from "./actions";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const EditCommerce = async ({ params }: Props) => {
  const { commerce_id } = await params;
  const commerce = await getCommerce(commerce_id);

  const handleUpdate = async (formData: FormData) => {
    "use server";
    await updateCommerce(commerce_id, formData);
  };

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Editar Comércio</h1>
          <p className="page-subtitle">
            Atualize as informações do seu estabelecimento
          </p>
        </div>
      </div>

      <form action={handleUpdate}>
        <div className="form-section">
          <div className="form-section-title">Informações básicas</div>
          <div className="fd-field" style={{ marginBottom: "1rem" }}>
            <label className="fd-label" htmlFor="name">
              Nome do Comércio
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={commerce.name}
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
              defaultValue={commerce.description}
              className="fd-input"
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Contato & Documentos</div>
          <div className="form-grid-2">
            <div className="fd-field">
              <label className="fd-label" htmlFor="phone">
                Telefone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={commerce.phone}
                className="fd-input"
              />
            </div>
            <div className="fd-field">
              <label className="fd-label" htmlFor="document_id">
                CNPJ
              </label>
              <input
                id="document_id"
                name="document_id"
                type="text"
                defaultValue={commerce.document_id}
                className="fd-input"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Horário de funcionamento</div>
          <div className="form-grid-2">
            <div className="fd-field">
              <label className="fd-label" htmlFor="open_at">
                Abre às
              </label>
              <input
                id="open_at"
                name="open_at"
                type="time"
                defaultValue={commerce.open_at}
                className="fd-input"
              />
            </div>
            <div className="fd-field">
              <label className="fd-label" htmlFor="closed_at">
                Fecha às
              </label>
              <input
                id="closed_at"
                name="closed_at"
                type="time"
                defaultValue={commerce.closed_at}
                className="fd-input"
              />
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

export default EditCommerce;
