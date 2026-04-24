import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" })
    ).toBeInTheDocument();
  });

  it("applies primary intent class by default", () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole("button")).toHaveClass("fd-btn-primary");
  });

  it("applies the correct intent class", () => {
    render(<Button intent="danger">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("fd-btn-danger");
  });

  it("applies ghost intent class", () => {
    render(<Button intent="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("fd-btn-ghost");
  });

  it("applies size class when provided", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("fd-btn-sm");
  });

  it("applies large size class", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("fd-btn-lg");
  });

  it("merges custom className", () => {
    render(<Button className="my-class">Custom</Button>);
    expect(screen.getByRole("button")).toHaveClass("my-class");
  });

  it("passes through native button props", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("respects disabled prop", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("always has fd-btn base class", () => {
    render(<Button>Base</Button>);
    expect(screen.getByRole("button")).toHaveClass("fd-btn");
  });
});
