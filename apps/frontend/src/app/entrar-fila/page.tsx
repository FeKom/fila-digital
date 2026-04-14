"use client";

import { useState } from "react";
import { Button } from "@/components";
import { Input } from "@/components/Input";
import { enterQueue } from "./actions";
import { Participant } from "@/types";

const EnterQueue = () => {
  const [result, setResult] = useState<{
    participant?: Participant;
    error?: string;
  } | null>(null);
  const [anonymousId] = useState(() => crypto.randomUUID());

  const handleSubmit = async (formData: FormData) => {
    const response = await enterQueue(formData);
    setResult(response);
  };

  if (result?.participant) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">Voce entrou na fila!</h1>
        <div className="card bg-base-100 shadow-md border border-base-200 p-6">
          <p className="text-lg">Sua posicao:</p>
          <span className="text-5xl font-bold text-primary">
            #{result.participant.position}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Aguarde sua vez. Voce sera chamado em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Entrar na Fila</h1>
      <p className="text-gray-500 mb-6">
        Insira os dados do QR Code para entrar na fila.
      </p>

      {result?.error && (
        <div className="alert alert-error mb-4">
          <span>{result.error}</span>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <Input
          name="queueId"
          label="ID da Fila"
          type="text"
          placeholder="ID da fila"
          className="input-md"
        />
        <Input
          name="qrcodeToken"
          label="Token do QR Code"
          type="text"
          placeholder="Token"
          className="input-md"
        />
        <Input
          name="userId"
          label="Seu ID de Usuario (opcional)"
          type="text"
          placeholder="Deixe vazio para entrar como anonimo"
          className="input-md"
        />
        <input type="hidden" name="anonymousId" value={anonymousId} />
        <div className="flex justify-end mt-6">
          <Button type="submit" intent="primary">
            ENTRAR NA FILA
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EnterQueue;
