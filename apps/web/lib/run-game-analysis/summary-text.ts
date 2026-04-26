function buildSummary(
  moveCount: number,
  blunders: number,
  mistakes: number,
  inaccuracies: number,
  best: number
): string {
  const parts: string[] = [];
  parts.push(`Game had ${moveCount} move${moveCount === 1 ? "" : "s"}.`);
  if (blunders > 0 || mistakes > 0 || inaccuracies > 0) {
    const items: string[] = [];
    if (blunders > 0) {
      items.push(`${blunders} blunder${blunders === 1 ? "" : "s"}`);
    }
    if (mistakes > 0) {
      items.push(`${mistakes} mistake${mistakes === 1 ? "" : "s"}`);
    }
    if (inaccuracies > 0) {
      items.push(
        `${inaccuracies} inaccurac${inaccuracies === 1 ? "y" : "ies"}`
      );
    }
    parts.push(`You had ${items.join(", ")}.`);
  }
  if (best > 0) {
    parts.push(`${best} of your moves matched the engine's best.`);
  }
  return parts.join(" ");
}

function buildSuggestions(
  blunders: number,
  mistakes: number,
  inaccuracies: number
): string[] {
  const list: string[] = [];
  if (blunders > 0) {
    list.push("Take more time on critical moves to avoid blunders.");
  }
  if (mistakes > 0) {
    list.push(
      "Review key positions: consider the engine's best move and why it's stronger."
    );
  }
  if (inaccuracies > 0) {
    list.push(
      "Watch for small inaccuracies—they add up; compare your move with the engine line in quiet positions."
    );
  }
  if (blunders + mistakes > 3) {
    list.push(
      "Try to reduce tactical errors by checking your moves before playing."
    );
  }
  if (list.length === 0) {
    list.push("Keep reviewing your games to spot small improvements.");
  }
  return list.slice(0, 4);
}

export { buildSummary, buildSuggestions };
