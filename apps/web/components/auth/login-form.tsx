"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import type { LoginFormData } from "@/lib/validations/auth";
import { loginSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { fromError } from "zod-validation-error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ?? true,
      });

      if (result.error) {
        const validationError = fromError(result.error);
        setFormError("root", {
          message: validationError.message || "Failed to sign in",
        });
        return;
      }

      const target =
        redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/";
      router.push(target);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const validationError = fromError(error);
        setFormError("root", {
          message: validationError.message || "An unexpected error occurred",
        });
      } else {
        setFormError("root", {
          message: "An unexpected error occurred",
        });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-6 text-2xl font-bold">Sign In</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={isSubmitting}
              placeholder="you@example.com"
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              {...register("password")}
              disabled={isSubmitting}
              placeholder="••••••••"
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>
          <div className="flex flex-row items-center justify-start gap-1.5">
            <input
              id="rememberMe"
              type="checkbox"
              {...register("rememberMe")}
              disabled={isSubmitting}
              className="size-4 shrink-0 rounded border-input"
              aria-invalid={errors.rememberMe ? "true" : "false"}
            />
            <FieldLabel
              htmlFor="rememberMe"
              className="shrink-0 cursor-pointer font-normal"
            >
              Remember me
            </FieldLabel>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
