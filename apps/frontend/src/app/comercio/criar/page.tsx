"use client";
import { useActionState } from "react";
import { createCommerce } from "./actions";

const CreateCommerce = () => {
  const [state, action, pending] = useActionState(createCommerce, {
    error: null,
  });

  return (
    <div className="page-container-sm">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cadastrar Comércio</h1>
          <p className="page-subtitle">
            Registre seu estabelecimento para gerenciar filas
          </p>
        </div>
      </div>

      <form action={action}>
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
              placeholder="Meu Comércio"
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
              placeholder="Descreva seu comércio"
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
                placeholder="(11) 99999-9999"
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
                placeholder="00.000.000/0000-00"
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
                className="fd-input"
              />
            </div>
          </div>
        </div>

        {state.error && (
          <div className="auth-error" role="alert">
            {state.error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="fd-btn fd-btn-primary"
            disabled={pending}
          >
            {pending ? "Cadastrando..." : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCommerce;
