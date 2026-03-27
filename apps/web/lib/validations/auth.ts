// Zod validation schemas for authentication forms

import { auth } from "@/lib/copy";
import { z } from "zod";

const { validation } = auth;

const loginSchema = z.object({
  email: z.email(validation.emailInvalid).min(1, validation.emailRequired),
  password: z.string().min(1, validation.passwordRequired),
  rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z
    .string()
    .min(1, validation.nameRequired)
    .min(2, validation.nameMinLength)
    .max(100, validation.nameMaxLength),
  email: z.email(validation.emailInvalid).min(1, validation.emailRequired),
  password: z
    .string()
    .min(8, validation.passwordMinLength)
    .max(100, validation.passwordMaxLength)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, validation.passwordComplexity),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
};
