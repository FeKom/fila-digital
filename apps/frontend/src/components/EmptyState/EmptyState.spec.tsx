import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders the message", () => {
    render(<EmptyState message="No items found." />);
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<EmptyState message="Empty" title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("does not render title when omitted", () => {
    render(<EmptyState message="Empty" />);
    expect(screen.queryByText("Nothing here")).not.toBeInTheDocument();
  });

  it("renders CTA link when both ctaLabel and ctaHref are provided", () => {
    render(
      <EmptyState
        message="Empty"
        ctaLabel="Create commerce"
        ctaHref="/comercio/criar"
      />
    );
    const link = screen.getByRole("link", { name: "Create commerce" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/comercio/criar");
  });

  it("does not render CTA link when only ctaLabel is provided", () => {
    render(<EmptyState message="Empty" ctaLabel="Create" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not render CTA link when only ctaHref is provided", () => {
    render(<EmptyState message="Empty" ctaHref="/comercio/criar" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the default SVG icon", () => {
    const { container } = render(<EmptyState message="Empty" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
