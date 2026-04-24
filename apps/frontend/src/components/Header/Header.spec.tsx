import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Header from "./Header";

vi.mock("@/app/actions", () => ({
  logout: vi.fn(),
}));

describe("Header", () => {
  describe("unauthenticated", () => {
    it("renders the logo", () => {
      render(<Header authenticated={false} />);
      expect(screen.getByText("Fila Digital")).toBeInTheDocument();
    });

    it("renders Entrar link", () => {
      render(<Header authenticated={false} />);
      const link = screen.getByRole("link", { name: "Entrar" });
      expect(link).toHaveAttribute("href", "/login");
    });

    it("renders Criar conta link", () => {
      render(<Header authenticated={false} />);
      const link = screen.getByRole("link", { name: "Criar conta" });
      expect(link).toHaveAttribute("href", "/registrar");
    });

    it("does not render navigation links", () => {
      render(<Header authenticated={false} />);
      expect(
        screen.queryByRole("link", { name: "Meus Comércios" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Minhas Filas" })
      ).not.toBeInTheDocument();
    });

    it("does not render Menu dropdown", () => {
      render(<Header authenticated={false} />);
      expect(screen.queryByText("Menu")).not.toBeInTheDocument();
    });
  });

  describe("authenticated", () => {
    it("renders the logo", () => {
      render(<Header authenticated={true} />);
      expect(screen.getByText("Fila Digital")).toBeInTheDocument();
    });

    it("renders Meus Comércios nav link", () => {
      render(<Header authenticated={true} />);
      const link = screen.getByRole("link", { name: "Meus Comércios" });
      expect(link).toHaveAttribute("href", "/");
    });

    it("renders Minhas Filas nav link", () => {
      render(<Header authenticated={true} />);
      const links = screen.getAllByRole("link", { name: "Minhas Filas" });
      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links[0]).toHaveAttribute("href", "/minhas-filas");
    });

    it("renders Menu dropdown trigger", () => {
      render(<Header authenticated={true} />);
      expect(screen.getByText("Menu")).toBeInTheDocument();
    });

    it("renders Sair button", () => {
      render(<Header authenticated={true} />);
      expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    });

    it("renders Cadastrar Comércio dropdown item", () => {
      render(<Header authenticated={true} />);
      expect(
        screen.getByRole("link", { name: "Cadastrar Comércio" })
      ).toHaveAttribute("href", "/comercio/criar");
    });

    it("does not render Entrar or Criar conta", () => {
      render(<Header authenticated={true} />);
      expect(
        screen.queryByRole("link", { name: "Entrar" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Criar conta" })
      ).not.toBeInTheDocument();
    });
  });
});
