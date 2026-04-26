import { describe, expect, it } from "vitest";

import {
  formatBookMoveCaption,
  openingNameSuffix,
} from "./format-book-move-caption";

describe("formatBookMoveCaption", () => {
  it("uses opening name only when present (ignores ECO in UI)", () => {
    expect(formatBookMoveCaption("D37", "Queen's Gambit Declined")).toBe(
      "Book move — Queen's Gambit Declined. Common in master games."
    );
  });

  it("uses name when eco missing", () => {
    expect(formatBookMoveCaption(undefined, "London System")).toBe(
      "Book move — London System. Common in master games."
    );
  });

  it("falls back when only ECO stored (no name to show)", () => {
    expect(formatBookMoveCaption("A45", "")).toBe(
      "Book move — common in master games."
    );
  });

  it("falls back when neither present", () => {
    expect(formatBookMoveCaption(undefined, undefined)).toBe(
      "Book move — common in master games."
    );
  });
});

describe("openingNameSuffix", () => {
  it("returns empty when no name", () => {
    expect(openingNameSuffix(undefined, undefined)).toBe("");
    expect(openingNameSuffix("D37", undefined)).toBe("");
  });

  it("appends name only (no ECO, no provider label)", () => {
    expect(
      openingNameSuffix("D00", "Queen's Pawn Game: Accelerated London")
    ).toBe(" Queen's Pawn Game: Accelerated London.");
  });
});
