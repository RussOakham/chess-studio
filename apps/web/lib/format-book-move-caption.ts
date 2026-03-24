/**
 * One-line caption for book moves in review UI. Shows the human-readable opening
 * name only (no ECO in the UI). `bookOpeningEco` is accepted for stored data shape
 * but not displayed.
 */
function formatBookMoveCaption(
  _bookOpeningEco?: string | null,
  bookOpeningName?: string | null
): string {
  const name = bookOpeningName?.trim() ?? "";
  if (name.length > 0) {
    return `Book move — ${name}. Common in master games.`;
  }
  return "Book move — common in master games.";
}

/**
 * Appended to engine captions when we have a named opening line (name only, no ECO).
 */
function openingNameSuffix(
  _bookOpeningEco?: string | null,
  bookOpeningName?: string | null
): string {
  const name = bookOpeningName?.trim() ?? "";
  if (name.length > 0) {
    return ` ${name}.`;
  }
  return "";
}

export { formatBookMoveCaption, openingNameSuffix };
