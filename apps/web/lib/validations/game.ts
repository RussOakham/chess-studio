// Zod validation schemas for game forms

import { newGame } from "@/lib/copy";
import { z } from "zod";

const { validation } = newGame;

const newGameSchema = z.object({
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .refine((val) => val !== undefined, {
      message: validation.difficultyRequired,
    }),
  color: z
    .enum(["white", "black", "random"])
    .refine((val) => val !== undefined, {
      message: validation.colorRequired,
    }),
});

type NewGameFormData = z.infer<typeof newGameSchema>;

export { newGameSchema, type NewGameFormData };
