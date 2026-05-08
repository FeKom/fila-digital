import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QueuePositionCard from "./QueuePositionCard";
import { UserQueue } from "@/types";

const queue: UserQueue = {
  queue_id: "q-1",
  queue_name: "Fila Principal",
  commerce_id: "c-1",
  commerce_name: "Barbearia Central",
  position: 3,
};

describe("QueuePositionCard", () => {
  it("renders queue name", () => {
    render(<QueuePositionCard queue={queue} />);
    expect(screen.getByText("Fila Principal")).toBeInTheDocument();
  });

  it("renders commerce name", () => {
    render(<QueuePositionCard queue={queue} />);
    expect(screen.getByText("Barbearia Central")).toBeInTheDocument();
  });

  it("renders position number", () => {
    render(<QueuePositionCard queue={queue} />);
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("renders 'na fila' label", () => {
    render(<QueuePositionCard queue={queue} />);
    expect(screen.getByText("na fila")).toBeInTheDocument();
  });

  it("links to commerce page", () => {
    render(<QueuePositionCard queue={queue} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/comercio/c-1");
  });

  it("applies position-card class", () => {
    render(<QueuePositionCard queue={queue} />);
    expect(screen.getByRole("link")).toHaveClass("position-card");
  });

  it("renders position 1 correctly", () => {
    render(<QueuePositionCard queue={{ ...queue, position: 1 }} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
  });
});
