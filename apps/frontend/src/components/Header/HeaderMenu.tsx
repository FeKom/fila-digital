"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";

const HeaderMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fd-dropdown" ref={ref}>
      <button
        className="app-nav-btn app-nav-btn-ghost"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Menu
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            marginLeft: "0.4rem",
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path
            d="M2 4L5 7L8 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fd-dropdown-menu" role="menu">
          <Link
            href="/comercio/criar"
            className="fd-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Cadastrar Comércio
          </Link>
          <Link
            href="/minhas-filas"
            className="fd-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Minhas Filas
          </Link>
          <div className="fd-dropdown-separator" />
          <form action={logout}>
            <button
              type="submit"
              className="fd-dropdown-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default HeaderMenu;
