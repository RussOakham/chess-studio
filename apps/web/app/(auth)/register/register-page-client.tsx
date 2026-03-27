"use client";

import { GitHubAuthSection } from "@/components/auth/github-auth-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { auth, common } from "@/lib/copy";
import type { RegisterFormData } from "@/lib/validations/auth";
import { registerSchema } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { fromError } from "zod-validation-error";

export function RegisterPageClient({
  githubOAuthEnabled,
}: {
  githubOAuthEnabled: boolean;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        const validationError = fromError(result.error);
        setFormError("root", {
          message: validationError.message || auth.register.errors.failedSignUp,
        });
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error: unknown) {
      if (error instanceof Error) {
        const validationError = fromError(error);
        setFormError("root", {
          message: validationError.message || common.unexpectedError,
        });
      } else {
        setFormError("root", {
          message: common.unexpectedError,
        });
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-6 text-2xl font-bold">{auth.register.heading}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errors.root && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="name">{auth.register.nameLabel}</FieldLabel>
            <Input
              id="name"
              type="text"
              {...register("name")}
              disabled={isSubmitting}
              placeholder={auth.register.namePlaceholder}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="email">{auth.register.emailLabel}</FieldLabel>
            <Input
              id="email"
              type="email"
              {...register("email")}
              disabled={isSubmitting}
              placeholder={auth.register.emailPlaceholder}
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="password">
              {auth.register.passwordLabel}
            </FieldLabel>
            <Input
              id="password"
              type="password"
              {...register("password")}
              disabled={isSubmitting}
              placeholder={auth.register.passwordPlaceholder}
              aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? auth.register.submitting : auth.register.submit}
          </Button>
        </form>
        <GitHubAuthSection callbackURL="/" enabled={githubOAuthEnabled} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {auth.register.footerHasAccount}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {auth.signIn}
          </Link>
        </p>
      </Card>
    </div>
  );
}
