import { Button } from "@/components";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { getQueue, updateQueue } from "./actions";

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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Editar Fila</h1>
      <form action={handleUpdate} className="space-y-4">
        <Input
          name="name"
          label="Nome da Fila"
          type="text"
          defaultValue={queue.name}
          className="input-md"
        />
        <Input
          name="description"
          label="Descricao"
          type="text"
          defaultValue={queue.description}
          className="input-md"
        />
        <Select
          name="type"
          label="Tipo"
          options={[
            { value: "permanent", label: "Permanente" },
            { value: "ephemera", label: "Temporaria" },
          ]}
          defaultValue={queue.type}
        />
        <Select
          name="status"
          label="Status"
          options={[
            { value: "open", label: "Aberta" },
            { value: "closed", label: "Fechada" },
          ]}
          defaultValue={queue.status}
        />
        <div className="flex justify-end mt-6">
          <Button type="submit" intent="primary">
            SALVAR
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditQueue;
