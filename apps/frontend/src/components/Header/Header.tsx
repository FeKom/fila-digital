import Link from "next/link";
import { MenuIcon, SearchIcon } from "../icons";
import { logout } from "@/app/actions";

const Header = ({ authenticated }: { authenticated: boolean }) => {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
            <MenuIcon />
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
          >
            {authenticated ? (
              <>
                <li>
                  <Link href="/comercio/criar">Cadastrar comércio</Link>
                </li>
                <li>
                  <Link href="/minhas-filas">Minhas filas</Link>
                </li>
                <li>
                  <form action={logout}>
                    <button type="submit" className="w-full text-left">
                      Sair
                    </button>
                  </form>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/login">Logar</Link>
                </li>
                <li>
                  <Link href="/registrar">Registrar</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
      <div className="navbar-center">
        <Link className="btn btn-ghost text-xl" href="/">
          Fila Digital
        </Link>
      </div>
      <div className="navbar-end">
        <button className="btn btn-ghost btn-circle">
          <SearchIcon />
        </button>
      </div>
    </div>
  );
};

export default Header;
