import type { EngineDifficultyId } from "@repo/chess";

/**
 * UI labels for the eight engine presets. Legacy `easy` / `medium` / `hard`
 * map to club / strong / advanced for display.
 */
const engineDifficultyOptions = [
  {
    id: "beginner" as const,
    title: "Beginner",
    subtitle: "Warm-up pace",
  },
  {
    id: "casual" as const,
    title: "Casual",
    subtitle: "Relaxed games",
  },
  {
    id: "club" as const,
    title: "Club",
    subtitle: "Weeknight league",
  },
  {
    id: "intermediate" as const,
    title: "Intermediate",
    subtitle: "Tactical focus",
  },
  {
    id: "strong" as const,
    title: "Strong",
    subtitle: "Serious competition",
  },
  {
    id: "advanced" as const,
    title: "Advanced",
    subtitle: "Sharp and punishing",
  },
  {
    id: "expert" as const,
    title: "Expert",
    subtitle: "Elite-level search",
  },
  {
    id: "maximum" as const,
    title: "Maximum",
    subtitle: "Strongest search (slowest)",
  },
] as const satisfies readonly {
  id: EngineDifficultyId;
  title: string;
  subtitle: string;
}[];

const LEGACY_TO_CANONICAL: Record<
  "easy" | "medium" | "hard",
  EngineDifficultyId
> = {
  easy: "club",
  medium: "strong",
  hard: "advanced",
};

function isLegacyDifficulty(
  raw: string
): raw is keyof typeof LEGACY_TO_CANONICAL {
  return raw in LEGACY_TO_CANONICAL;
}

function resolveCanonicalId(raw: string): EngineDifficultyId | undefined {
  if (isLegacyDifficulty(raw)) {
    return LEGACY_TO_CANONICAL[raw];
  }
  return engineDifficultyOptions.find((option) => option.id === raw)?.id;
}

/** Short title for sidebars (e.g. `Engine (Strong)`). */
function getEngineDifficultyShortTitle(raw: string): string {
  const id = resolveCanonicalId(raw);
  if (id === undefined) {
    return raw;
  }
  const opt = engineDifficultyOptions.find((option) => option.id === id);
  return opt?.title ?? raw;
}

export { engineDifficultyOptions, getEngineDifficultyShortTitle };
