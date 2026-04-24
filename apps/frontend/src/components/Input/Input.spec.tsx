import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "./Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input name="email" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Input name="email" label="E-mail" />);
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("does not render label when omitted", () => {
    render(<Input name="email" />);
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
  });

  it("renders hint text when provided", () => {
    render(<Input name="email" hint="Use your work email" />);
    expect(screen.getByText("Use your work email")).toBeInTheDocument();
  });

  it("does not render hint when omitted", () => {
    render(<Input name="email" />);
    expect(screen.queryByText("Use your work email")).not.toBeInTheDocument();
  });

  it("sets name attribute correctly", () => {
    render(<Input name="phone" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "phone");
  });

  it("associates label with input via id", () => {
    render(<Input name="username" label="Username" />);
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("id", "username");
  });

  it("applies fd-input class", () => {
    render(<Input name="test" />);
    expect(screen.getByRole("textbox")).toHaveClass("fd-input");
  });

  it("forwards native input props", async () => {
    render(<Input name="search" type="search" placeholder="Search..." />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveAttribute("type", "search");
  });

  it("accepts typed input", async () => {
    render(<Input name="name" />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "João");
    expect(input).toHaveValue("João");
  });
});
