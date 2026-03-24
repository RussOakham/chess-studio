import {
  formatBookMoveCaption,
  lichessOpeningSuffix,
} from "./format-book-move-caption";

describe("formatBookMoveCaption", () => {
  it("uses eco and name when both present", () => {
    expect(formatBookMoveCaption("D37", "Queen's Gambit Declined")).toBe(
      "Book move — D37 Queen's Gambit Declined. Common in master games."
    );
  });

  it("uses name only when eco missing", () => {
    expect(formatBookMoveCaption(undefined, "London System")).toBe(
      "Book move — London System. Common in master games."
    );
  });

  it("uses eco only when name missing", () => {
    expect(formatBookMoveCaption("A45", "")).toBe(
      "Book move — ECO A45. Common in master games."
    );
  });

  it("falls back when neither present", () => {
    expect(formatBookMoveCaption(undefined, undefined)).toBe(
      "Book move — common in master games."
    );
  });
});

describe("lichessOpeningSuffix", () => {
  it("returns empty when no data", () => {
    expect(lichessOpeningSuffix(undefined, undefined)).toBe("");
  });

  it("formats eco and name", () => {
    expect(lichessOpeningSuffix("D37", "QGD")).toBe(" Lichess: D37 QGD.");
  });
});
