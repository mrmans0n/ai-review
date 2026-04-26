import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ViewTypeControl } from "./ViewTypeControl";

describe("ViewTypeControl", () => {
  it("changes the view type", () => {
    const onChange = vi.fn();
    render(<ViewTypeControl value="split" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "unified" }));

    expect(onChange).toHaveBeenCalledWith("unified");
  });

  it("marks the active option", () => {
    render(<ViewTypeControl value="split" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "split" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
