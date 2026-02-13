"use client";

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
import { api } from "@/convex/_generated/api";
import { newGameSchema } from "@/lib/validations/game";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function NewGamePage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
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

  const createGameMutation = useMutation(api.games.create);

  const onSubmit = async (data: NewGameFormData) => {
    setIsPending(true);
    setFormError("root", { message: undefined });
    try {
      const result = await createGameMutation({
        difficulty: data.difficulty,
        color: data.color,
      });
      router.push(`/game/${result.id}`);
    } catch (error: unknown) {
      setFormError("root", {
        message:
          error instanceof Error ? error.message : "Failed to create game",
      });
    } finally {
      setIsPending(false);
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
                disabled={isPending}
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
                disabled={isPending}
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
              {isPending ? (
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
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Creating game..." : "Start Game"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
