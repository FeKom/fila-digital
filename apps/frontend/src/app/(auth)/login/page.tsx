"use client";
import { submitLoginForm } from "@/domains/user/user.actions";
import { submitGoogleLogin } from "./google-action";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { claimAnonymous } from "@/lib/claimAnonymous";
import { GoogleLogin } from "@react-oauth/google";

const Login = () => {
  const [state, action, pending] = useActionState(submitLoginForm, {
    error: null,
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const router = useRouter();

  // When email login succeeds the server redirects — claim before that happens
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
        <div className="auth-brand-badge">Gerencie filas em tempo real</div>
      </div>

      {/* Form panel */}
      <div className="auth-panel-form">
        <div className="auth-form-inner">
          <h2 className="auth-form-title">
            Bem-vindo
            <br />
            de volta.
          </h2>
          <p className="auth-form-subtitle">Acesse sua conta para continuar</p>

          <form
            action={action}
            className={state.error ? "auth-form-shake" : ""}
          >
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
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="auth-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  Entrando…
                </span>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          {googleError && (
            <div className="auth-error" role="alert">
              {googleError}
            </div>
          )}

          <GoogleLogin
            onSuccess={async (res) => {
              setGoogleError(null);
              if (!res.credential) return;
              const result = await submitGoogleLogin(res.credential);
              if ("success" in result) {
                await claimAnonymous();
                router.push("/");
              } else {
                setGoogleError(result.error);
              }
            }}
            onError={() =>
              setGoogleError("Erro ao autenticar com Google. Tente novamente.")
            }
            width="100%"
            text="signin_with"
          />

          <p className="auth-footer-link">
            Ainda não tem uma conta? <a href="/registrar">Criar conta</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
