// Zod validation schemas for game forms

import { z } from "zod";

const newGameSchema = z.object({
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .refine((val) => val !== undefined, {
      message: "Please select a difficulty level",
    }),
  color: z
    .enum(["white", "black", "random"])
    .refine((val) => val !== undefined, {
      message: "Please select a color",
    }),
});

type NewGameFormData = z.infer<typeof newGameSchema>;

export { newGameSchema, type NewGameFormData };
