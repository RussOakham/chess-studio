"use client";

import type { NewGameFormData } from "@/lib/validations/game";

import { Button } from "@/components/ui/button";
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
import { newGameSchema } from "@/lib/validations/game";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { fromError } from "zod-validation-error";

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
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        const errorData = (await response.json()) as { error?: string };
        setFormError("root", {
          message: errorData.error || "Failed to create game",
        });
        setIsSubmitting(false);
        return;
      }

      // oxlint-disable-next-line typescript/no-unsafe-assignment
      const gameData = (await response.json()) as { id: string };

      // Redirect to game page
      router.push(`/game/${gameData.id}`);
      router.refresh();
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
                  setValue("difficulty", value as "easy" | "medium" | "hard", {
                    shouldValidate: true,
                  });
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
                  setValue("color", value as "white" | "black" | "random", {
                    shouldValidate: true,
                  });
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
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <Link href="/">Cancel</Link>
                </Button>
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
