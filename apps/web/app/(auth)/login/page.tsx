"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fromError } from "zod-validation-error";
import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        const validationError = fromError(result.error);
        setFormError("root", {
          message: validationError.message || "Failed to sign in",
        });
        return;
      }

      // Redirect to home page on success
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        const validationError = fromError(err);
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
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-primary hover:underline">
            Sign up
          </a>
        </p>
      </Card>
    </div>
  );
}
