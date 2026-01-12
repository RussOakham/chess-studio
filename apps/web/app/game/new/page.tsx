"use client";

import type { CreateGameResponse } from "@/lib/types/api";
import type { NewGameFormData } from "@/lib/validations/game";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, getApiErrorMessage } from "@/lib/api/client";
import { newGameSchema } from "@/lib/validations/game";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function NewGamePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    setError: setFormError,
  } = useForm<NewGameFormData>({
    resolver: zodResolver(newGameSchema),
    defaultValues: {
      difficulty: "medium",
      color: "random",
    },
  });

  const difficulty = watch("difficulty");
  const color = watch("color");

  const onSubmit = async (data: NewGameFormData) => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.post<CreateGameResponse>("/games", data);

      // Redirect to game page
      router.push(`/game/${response.data.id}`);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error);
      setFormError("root", {
        message: errorMessage,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">New Game</CardTitle>
          <CardDescription>
            Choose your difficulty level and color to start a new chess game
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errors.root && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.root.message}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="difficulty">Difficulty</FieldLabel>
              <Select
                value={difficulty}
                onValueChange={(value) => {
                  if (
                    value &&
                    (value === "easy" || value === "medium" || value === "hard")
                  ) {
                    setValue("difficulty", value, {
                      shouldValidate: true,
                    });
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="difficulty"
                  aria-invalid={errors.difficulty ? "true" : "false"}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy (Engine depth: 5-8)</SelectItem>
                  <SelectItem value="medium">
                    Medium (Engine depth: 10-12)
                  </SelectItem>
                  <SelectItem value="hard">Hard (Engine depth: 15+)</SelectItem>
                </SelectContent>
              </Select>
              {errors.difficulty && (
                <FieldError>{errors.difficulty.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="color">Play As</FieldLabel>
              <Select
                value={color}
                onValueChange={(value) => {
                  if (
                    value &&
                    (value === "white" ||
                      value === "black" ||
                      value === "random")
                  ) {
                    setValue("color", value, {
                      shouldValidate: true,
                    });
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="color"
                  aria-invalid={errors.color ? "true" : "false"}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
              {errors.color && <FieldError>{errors.color.message}</FieldError>}
            </Field>

            <div className="flex gap-3">
              {isSubmitting ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  Cancel
                </Button>
              ) : (
                <Link
                  href="/"
                  className={buttonVariants({
                    variant: "outline",
                    className: "flex-1",
                  })}
                >
                  Cancel
                </Link>
              )}
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Creating game..." : "Start Game"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
