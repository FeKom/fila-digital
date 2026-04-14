import { Button } from "@/components";
import { Input } from "@/components/Input";
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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Editar Comercio</h1>
      <form action={handleUpdate} className="space-y-4">
        <Input
          name="name"
          label="Nome do Comercio"
          type="text"
          defaultValue={commerce.name}
          className="input-md"
        />
        <Input
          name="description"
          label="Descricao"
          type="text"
          defaultValue={commerce.description}
          className="input-md"
        />
        <Input
          name="phone"
          label="Telefone"
          type="tel"
          defaultValue={commerce.phone}
          className="input-md"
        />
        <Input
          name="document_id"
          label="CNPJ"
          type="text"
          defaultValue={commerce.document_id}
          className="input-md"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="open_at"
            label="Abre as"
            type="time"
            defaultValue={commerce.open_at}
            className="input-md"
          />
          <Input
            name="closed_at"
            label="Fecha as"
            type="time"
            defaultValue={commerce.closed_at}
            className="input-md"
          />
        </div>
        <div className="flex justify-end mt-6">
          <Button type="submit" intent="primary">
            SALVAR
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditCommerce;
