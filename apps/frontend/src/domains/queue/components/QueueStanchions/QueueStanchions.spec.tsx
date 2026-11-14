import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueueStanchions } from "./QueueStanchions";

describe("QueueStanchions", () => {
  it("renders waiting state with user position badge", () => {
    render(<QueueStanchions position={2} status="waiting" />);
    expect(screen.getByTestId("queue-stanchions")).toHaveAttribute(
      "data-status",
      "waiting"
    );
    expect(screen.getByText("Posição #2")).toBeInTheDocument();
    expect(screen.getByText("VOCÊ #2")).toBeInTheDocument();
  });

  it("renders called state ('Sua vez chegou') with open rope indicator", () => {
    render(<QueueStanchions position={1} status="called" />);
    expect(screen.getByTestId("queue-stanchions")).toHaveAttribute(
      "data-status",
      "called"
    );
    expect(screen.getByText("Sua vez chegou")).toBeInTheDocument();
    expect(screen.getByText("SUA VEZ")).toBeInTheDocument();
    expect(screen.getByText("PASSE")).toBeInTheDocument();
  });

  it("renders ready state ('Pedido pronto') with open rope indicator", () => {
    render(<QueueStanchions position={1} status="ready" />);
    expect(screen.getByTestId("queue-stanchions")).toHaveAttribute(
      "data-status",
      "ready"
    );
    expect(screen.getByText("Pedido pronto")).toBeInTheDocument();
    expect(screen.getByText("Entrada liberada")).toBeInTheDocument();
  });
});
