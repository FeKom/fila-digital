import Link from "next/link";
import { logout } from "@/app/actions";

const Header = ({ authenticated }: { authenticated: boolean }) => {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Logo */}
        <Link href="/" className="app-logo">
          <span className="app-logo-dot" />
          Fila Digital
        </Link>

        {/* Desktop nav */}
        {authenticated && (
          <nav className="app-nav" style={{ display: "flex" }}>
            <Link href="/" className="app-nav-link">
              Meus Comércios
            </Link>
            <Link href="/minhas-filas" className="app-nav-link">
              Minhas Filas
            </Link>
          </nav>
        )}

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {authenticated ? (
            <details className="fd-dropdown">
              <summary
                className="app-nav-btn app-nav-btn-ghost"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                Menu
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 4L5 7L8 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <div className="fd-dropdown-menu">
                <Link href="/comercio/criar" className="fd-dropdown-item">
                  Cadastrar Comércio
                </Link>
                <Link href="/minhas-filas" className="fd-dropdown-item">
                  Minhas Filas
                </Link>
                <div className="fd-dropdown-separator" />
                <form action={logout}>
                  <button type="submit" className="fd-dropdown-item">
                    Sair
                  </button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="app-nav-btn app-nav-btn-ghost">
                Entrar
              </Link>
              <Link
                href="/registrar"
                className="app-nav-btn app-nav-btn-primary"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
