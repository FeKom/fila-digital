import { describe, it, expect } from "vitest";
import { cnJoin } from "./cnjoin";

describe("cnJoin", () => {
  it("joins multiple class strings", () => {
    expect(cnJoin("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cnJoin("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cnJoin(false, undefined, null)).toBe("");
  });

  it("handles a single class", () => {
    expect(cnJoin("fd-btn")).toBe("fd-btn");
  });

  it("handles conditional classes", () => {
    const active = true;
    const disabled = false;
    expect(cnJoin("base", active && "active", disabled && "disabled")).toBe(
      "base active"
    );
  });
});
