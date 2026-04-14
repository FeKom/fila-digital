import { Button } from "@/components";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { createQueue } from "./actions";
import { redirect } from "next/navigation";

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
      <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
        <h1 className="text-2xl font-bold">Fila criada com sucesso!</h1>
        <p className="text-gray-500">
          Use o QR Code abaixo para que clientes entrem na fila.
        </p>
        <QRCodeDisplay
          base64Image={decodeURIComponent(qrcode)}
          queueName={queueName || "fila"}
        />
        <a
          href={`/comercio/${commerce_id}`}
          className="btn btn-primary rounded-field"
        >
          Voltar ao Comercio
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Criar Fila</h1>
      <form action={handleCreate} className="space-y-4">
        <Input
          name="name"
          label="Nome da Fila"
          type="text"
          placeholder="Fila Principal"
          className="input-md"
        />
        <Input
          name="description"
          label="Descricao"
          type="text"
          placeholder="Descreva a fila"
          className="input-md"
        />
        <Select
          name="type"
          label="Tipo"
          options={[
            { value: "permanent", label: "Permanente" },
            { value: "ephemera", label: "Temporaria" },
          ]}
          defaultValue="permanent"
        />
        <Select
          name="status"
          label="Status"
          options={[
            { value: "open", label: "Aberta" },
            { value: "closed", label: "Fechada" },
          ]}
          defaultValue="open"
        />
        <div className="flex justify-end mt-6">
          <Button type="submit" intent="primary">
            CRIAR FILA
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateQueue;
