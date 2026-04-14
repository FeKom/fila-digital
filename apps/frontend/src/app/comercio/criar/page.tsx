import { Button } from "@/components";
import { Input } from "@/components/Input";
import { createCommerce } from "./actions";

const CreateCommerce = () => {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Cadastrar Comercio</h1>
      <form action={createCommerce} className="space-y-4">
        <Input
          name="name"
          label="Nome do Comercio"
          type="text"
          placeholder="Meu Comercio"
          className="input-md"
        />
        <Input
          name="description"
          label="Descricao"
          type="text"
          placeholder="Descreva seu comercio"
          className="input-md"
        />
        <Input
          name="phone"
          label="Telefone"
          type="tel"
          placeholder="(11) 99999-9999"
          className="input-md"
        />
        <Input
          name="document_id"
          label="CNPJ"
          type="text"
          placeholder="00.000.000/0000-00"
          className="input-md"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="open_at"
            label="Abre as"
            type="time"
            className="input-md"
          />
          <Input
            name="closed_at"
            label="Fecha as"
            type="time"
            className="input-md"
          />
        </div>
        <div className="flex justify-end mt-6">
          <Button type="submit" intent="primary">
            CADASTRAR
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateCommerce;
