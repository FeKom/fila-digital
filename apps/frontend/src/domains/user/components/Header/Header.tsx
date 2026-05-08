import Link from "next/link";
import HeaderMenu from "./HeaderMenu";

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
          <nav className="app-nav">
            <Link href="/procurar-fila" className="app-nav-link">
              Procurar Fila
            </Link>
            <Link href="/meus-comercios" className="app-nav-link">
              Meus Comércios
            </Link>
            <Link href="/minhas-filas" className="app-nav-link">
              Minhas Filas
            </Link>
          </nav>
        )}

        {/* Right side */}
        <div className="app-header-actions">
          {authenticated ? (
            <HeaderMenu />
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
