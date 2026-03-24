/**
 * One-line caption for book moves in review UI. Uses Lichess explorer ECO/name when stored.
 * AI or other commentary can extend this later.
 */
function formatBookMoveCaption(
  bookOpeningEco?: string | null,
  bookOpeningName?: string | null
): string {
  const eco = bookOpeningEco?.trim() ?? "";
  const name = bookOpeningName?.trim() ?? "";

  if (eco.length > 0 && name.length > 0) {
    return `Book move — ${eco} ${name}. Common in master games.`;
  }
  if (name.length > 0) {
    return `Book move — ${name}. Common in master games.`;
  }
  if (eco.length > 0) {
    return `Book move — ECO ${eco}. Common in master games.`;
  }
  return "Book move — common in master games.";
}

/**
 * Appended to engine captions (best, blunder, …) when Lichess returned a named line.
 */
function lichessOpeningSuffix(
  bookOpeningEco?: string | null,
  bookOpeningName?: string | null
): string {
  const eco = bookOpeningEco?.trim() ?? "";
  const name = bookOpeningName?.trim() ?? "";
  if (eco.length > 0 && name.length > 0) {
    return ` Lichess: ${eco} ${name}.`;
  }
  if (name.length > 0) {
    return ` Lichess: ${name}.`;
  }
  if (eco.length > 0) {
    return ` Lichess: ECO ${eco}.`;
  }
  return "";
}

export { formatBookMoveCaption, lichessOpeningSuffix };
