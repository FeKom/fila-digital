import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "./Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Open</Badge>);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("has fd-badge base class", () => {
    render(<Badge>Base</Badge>);
    expect(screen.getByText("Base")).toHaveClass("fd-badge");
  });

  it("applies primary variant by default", () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText("Default")).toHaveClass("fd-badge-primary");
  });

  it("applies success variant", () => {
    render(<Badge variant="success">Open</Badge>);
    expect(screen.getByText("Open")).toHaveClass("fd-badge-success");
  });

  it("applies error variant", () => {
    render(<Badge variant="error">Closed</Badge>);
    expect(screen.getByText("Closed")).toHaveClass("fd-badge-error");
  });

  it("applies warning variant", () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText("Warning")).toHaveClass("fd-badge-warning");
  });

  it("merges custom className", () => {
    render(<Badge className="ml-2">Custom</Badge>);
    expect(screen.getByText("Custom")).toHaveClass("ml-2");
  });

  it("renders as a span", () => {
    const { container } = render(<Badge>Span</Badge>);
    expect(container.querySelector("span")).toBeInTheDocument();
  });
});
