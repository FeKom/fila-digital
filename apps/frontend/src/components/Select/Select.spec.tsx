import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Select from "./Select";

const options = [
  { value: "open", label: "Aberta" },
  { value: "closed", label: "Fechada" },
];

describe("Select", () => {
  it("renders all options", () => {
    render(<Select name="status" options={options} />);
    expect(screen.getByRole("option", { name: "Aberta" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fechada" })).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Select name="status" label="Status" options={options} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("does not render label when omitted", () => {
    render(<Select name="status" options={options} />);
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
  });

  it("sets name attribute", () => {
    render(<Select name="queue_type" options={options} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("name", "queue_type");
  });

  it("associates label with select via id", () => {
    render(<Select name="status" label="Status" options={options} />);
    const select = screen.getByLabelText("Status");
    expect(select).toHaveAttribute("id", "status");
  });

  it("applies fd-select class", () => {
    render(<Select name="status" options={options} />);
    expect(screen.getByRole("combobox")).toHaveClass("fd-select");
  });

  it("applies additional className", () => {
    render(<Select name="status" options={options} className="w-full" />);
    expect(screen.getByRole("combobox")).toHaveClass("fd-select", "w-full");
  });

  it("sets defaultValue correctly", () => {
    render(<Select name="status" options={options} defaultValue="closed" />);
    expect(screen.getByRole("combobox")).toHaveValue("closed");
  });

  it("renders empty state with no options", () => {
    render(<Select name="status" options={[]} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
