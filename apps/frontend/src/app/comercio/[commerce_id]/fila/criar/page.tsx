import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { createQueue } from "./actions";
import { redirect } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{ commerce_id: string }>;
  searchParams: Promise<{ qrcode?: string; queueName?: string }>;
};

const CreateQueue = async ({ params, searchParams }: Props) => {
  const { commerce_id } = await params;
  const { qrcode, queueName } = await searchParams;

  const handleCreate = async (formData: FormData) => {
    "use server";
    const queue = await createQueue(commerce_id, formData);
    if (queue.qrcode) {
      redirect(
        `/comercio/${commerce_id}/fila/criar?qrcode=${encodeURIComponent(queue.qrcode)}&queueName=${encodeURIComponent(queue.name)}`
      );
    } else {
      redirect(`/comercio/${commerce_id}`);
    }
  };

  if (qrcode) {
    return (
      <div className="page-container-sm">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            className="page-title"
            style={{ justifyContent: "center", display: "flex" }}
          >
            Fila criada com sucesso!
          </h1>
          <p className="page-subtitle" style={{ textAlign: "center" }}>
            Use o QR Code abaixo para que clientes entrem na fila.
          </p>
        </div>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <QRCodeDisplay
            base64Image={decodeURIComponent(qrcode)}
            queueName={queueName || "fila"}
          />
        </div>
        <div
          className="form-actions"
          style={{ borderTop: "none", paddingTop: 0 }}
        >
          <Link
            href={`/comercio/${commerce_id}`}
            className="fd-btn fd-btn-primary"
          >
            Voltar ao Comércio
          </Link>
        </div>
      </div>
    );
  }

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
