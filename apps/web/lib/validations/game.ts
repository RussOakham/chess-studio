// Zod validation schemas for game forms

import { newGame } from "@/lib/copy";
import { ENGINE_DIFFICULTY_IDS } from "@repo/chess";
import { z } from "zod";

const { validation } = newGame;

const newGameSchema = z.object({
  difficulty: z.enum(ENGINE_DIFFICULTY_IDS, {
    error: (issue) =>
      issue.input === undefined
        ? validation.difficultyRequired
        : validation.invalidDifficulty,
  }),
  color: z.enum(["white", "black", "random"], {
    error: (issue) =>
      issue.input === undefined
        ? validation.colorRequired
        : validation.invalidColor,
  }),
});

type NewGameFormData = z.infer<typeof newGameSchema>;

export { newGameSchema, type NewGameFormData };
