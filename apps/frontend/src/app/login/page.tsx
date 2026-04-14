"use client";
import { submitLoginForm } from "./actions";
import { useActionState } from "react";

const QueueDots = () => (
  <div className="auth-queue-grid" aria-hidden="true">
    {Array.from({ length: 8 }).map((_, col) => (
      <div key={col} className="auth-queue-col">
        {Array.from({ length: 20 }).map((_, row) => (
          <div
            key={row}
            className="auth-queue-dot"
            style={{ animationDelay: `${(col * 0.18 + row * 0.09) % 2.4}s` }}
          />
        ))}
      </div>
    ))}
  </div>
);

const Login = () => {
  const [state, action, pending] = useActionState(submitLoginForm, {
    error: null,
  });

  return (
    <div className="auth-layout">
      {/* Brand panel */}
      <div className="auth-panel-brand">
        <QueueDots />
        <div>
          <p className="auth-brand-tagline">Sistema de filas</p>
          <h1 className="auth-brand-text">
            Fila
            <span className="auth-brand-accent">Digital</span>
          </h1>
        </div>
        <div className="auth-brand-badge">
          <span className="auth-brand-badge-dot" />
          Gerencie filas em tempo real
        </div>
      </div>

      {/* Form panel */}
      <div className="auth-panel-form">
        <div className="auth-form-inner">
          <h2 className="auth-form-title">
            Boas-vindas
            <br />
            de volta.
          </h2>
          <p className="auth-form-subtitle">
            Entre com sua conta para continuar
          </p>

          <form action={action}>
            <div className="auth-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="voce@dominio.com"
                className="auth-input"
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="auth-input"
                autoComplete="current-password"
              />
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
                  <circle cx="7" cy="7" r="6.5" stroke="#dc2626" />
                  <path
                    d="M7 4v3.5"
                    stroke="#dc2626"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <circle cx="7" cy="10" r="0.7" fill="#dc2626" />
                </svg>
                {state.error}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={pending}>
              {pending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="auth-footer-link">
            Não tem uma conta? <a href="/registrar">Criar conta</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
