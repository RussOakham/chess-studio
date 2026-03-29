"use client";

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
import { engineDifficultyOptions, newGame } from "@/lib/copy";
import type { NewGameFormData } from "@/lib/validations/game";
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
    clearErrors,
  } = useForm<NewGameFormData>({
    resolver: zodResolver(newGameSchema),
    defaultValues: {
      difficulty: "strong",
      color: "random",
    },
  });

  const difficulty = watch("difficulty");
  const color = watch("color");

  const createGameMutation = useMutation(api.games.create);

  const onSubmit = async (data: NewGameFormData) => {
    setIsPending(true);
    clearErrors("root");
    /** Avoid clearing pending in `finally` after `router.push` — same flicker as full-page OAuth redirect. */
    let navigatingToGame = false;
    try {
      const result = await createGameMutation({
        difficulty: data.difficulty,
        color: data.color,
      });
      navigatingToGame = true;
      router.push(`/game/${result.id}`);
    } catch (error: unknown) {
      setFormError("root", {
        message:
          error instanceof Error ? error.message : newGame.errors.failedCreate,
      });
    } finally {
      if (!navigatingToGame) {
        setIsPending(false);
      }
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{newGame.title}</CardTitle>
          <CardDescription>{newGame.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errors.root?.message ? (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {errors.root.message}
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor="difficulty">
                {newGame.fields.difficulty}
              </FieldLabel>
              <Select
                value={difficulty}
                onValueChange={(value) => {
                  if (
                    value &&
                    engineDifficultyOptions.some(
                      (option) => option.id === value
                    )
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
                  {engineDifficultyOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="font-medium">{option.title}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {option.subtitle}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-snug text-muted-foreground">
                {newGame.difficultyLegend}
              </p>
              {errors.difficulty && (
                <FieldError>{errors.difficulty.message}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="color">{newGame.fields.color}</FieldLabel>
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
                  <SelectItem value="white">{newGame.color.white}</SelectItem>
                  <SelectItem value="black">{newGame.color.black}</SelectItem>
                  <SelectItem value="random">{newGame.color.random}</SelectItem>
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
                  {newGame.actions.cancel}
                </Button>
              ) : (
                <Link
                  href="/"
                  className={buttonVariants({
                    variant: "outline",
                    className: "flex-1",
                  })}
                >
                  {newGame.actions.cancel}
                </Link>
              )}
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending
                  ? newGame.actions.creating
                  : newGame.actions.startGame}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
