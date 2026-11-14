"use client";
import { submitRegisterForm } from "@/domains/user/user.actions";
import { useActionState, useEffect, useState } from "react";
import { claimAnonymous } from "@/lib/claimAnonymous";
import { useAnonymousId } from "@/lib/useAnonymousId";

const Register = () => {
  const [state, action, pending] = useActionState(submitRegisterForm, {
    error: null,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const anonymousId = useAnonymousId();

  useEffect(() => {
    if (!pending && !state.error) {
      claimAnonymous();
    }
  }, [pending, state.error]);

  return (
    <div className="auth-layout">
      {/* Brand panel */}
      <div className="auth-panel-brand">
        <div>
          <p className="auth-brand-tagline">Sistema de filas</p>
          <h1 className="auth-brand-text">
            Fila
            <span className="auth-brand-accent">Digital</span>
          </h1>
        </div>
        <div className="auth-brand-badge">Comece a gerenciar suas filas</div>
      </div>

      {/* Form panel */}
      <div className="auth-panel-form">
        <div className="auth-form-inner">
          <h2 className="auth-form-title">
            Crie sua
            <br />
            conta.
          </h2>
          <p className="auth-form-subtitle">Preencha os dados para começar</p>

          <form
            action={action}
            className={state.error ? "auth-form-shake" : ""}
          >
            <input type="hidden" name="anonymousId" value={anonymousId} />
            <div className="auth-field">
              <label htmlFor="name">Nome completo</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="João Silva"
                className="auth-input"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="voce@dominio.com"
                className="auth-input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="phone">Telefone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                className="auth-input"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="auth-hint">Formato: (DDD) 99999-9999</span>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="auth-input"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="auth-hint">Mínimo 8 caracteres</span>
            </div>

            {state.error && (
              <div className="auth-error" role="alert">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
                  <path
                    d="M7 4v3.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <circle cx="7" cy="10" r="0.7" fill="currentColor" />
                </svg>
                {state.error}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={pending}>
              {pending ? (
                <span className="auth-submit-pending">
                  <span className="auth-spinner" />
                  Criando conta…
                </span>
              ) : (
                "Criar conta"
              )}
            </button>
          </form>

          <p className="auth-footer-link">
            Já possui uma conta? <a href="/login">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
