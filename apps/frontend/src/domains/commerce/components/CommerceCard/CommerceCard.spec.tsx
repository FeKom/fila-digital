import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CommerceCard from "./CommerceCard";
import { Commerce, Queue } from "@/types";

const baseQueue: Queue = {
  id: "q-1",
  name: "Fila Principal",
  description: "",
  type: "permanent",
  status: "open",
  commerce_id: "abc-123",
  created_at: "2024-01-01T00:00:00Z",
};

const baseCommerce: Commerce = {
  id: "abc-123",
  name: "Barbearia Central",
  description: "Cortes modernos",
  phone: "11999999999",
  document_id: "12345678000199",
  open_at: "08:00",
  closed_at: "18:00",
  owner_id: "owner-1",
  active: true,
};

describe("CommerceCard", () => {
  it("renders commerce name", () => {
    render(<CommerceCard commerce={baseCommerce} />);
    expect(screen.getByText("Barbearia Central")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<CommerceCard commerce={baseCommerce} />);
    expect(screen.getByText("Cortes modernos")).toBeInTheDocument();
  });

  it("does not render description when absent", () => {
    render(<CommerceCard commerce={{ ...baseCommerce, description: "" }} />);
    expect(screen.queryByText("Cortes modernos")).not.toBeInTheDocument();
  });

  it("renders opening hours", () => {
    render(<CommerceCard commerce={baseCommerce} />);
    expect(screen.getByText("08:00 — 18:00")).toBeInTheDocument();
  });

  it("links to commerce dashboard page", () => {
    render(<CommerceCard commerce={baseCommerce} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/comercio/abc-123/dashboard"
    );
  });

  it("renders open status when queue is open", () => {
    render(<CommerceCard commerce={{ ...baseCommerce, queue: baseQueue }} />);
    expect(screen.getByText("Aberta")).toBeInTheDocument();
  });

  it("renders closed status when queue is closed", () => {
    render(
      <CommerceCard
        commerce={{
          ...baseCommerce,
          queue: { ...baseQueue, status: "closed" },
        }}
      />
    );
    expect(screen.getByText("Fechada")).toBeInTheDocument();
  });

  it("does not render queue status when there is no queue", () => {
    render(<CommerceCard commerce={baseCommerce} />);
    expect(screen.queryByText("Aberta")).not.toBeInTheDocument();
    expect(screen.queryByText("Fechada")).not.toBeInTheDocument();
  });
});
