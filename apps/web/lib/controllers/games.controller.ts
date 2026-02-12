// Controller layer for games - request/response orchestration

import type { GamesService } from "@/lib/services/games.service";
import type { CreateGameRequest } from "@/lib/types/api";
import type { NextResponse } from "next/server";
import type { ZodSchema } from "zod";

import { getSession } from "@/lib/auth-server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { newGameSchema } from "@/lib/validations/game";

export class GamesController {
  constructor(private service: GamesService) {}

  async listGames(): Promise<NextResponse> {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    try {
      const games = await this.service.listUserGames(session.user.id);
      return successResponse(games);
    } catch (error) {
      console.error("Error listing games:", error);
      return errorResponse("Internal server error", 500);
    }
  }

  async createGame(request: Request): Promise<NextResponse> {
    const session = await getSession();
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    try {
      const body = await this.validateRequest<CreateGameRequest>(
        request,
        newGameSchema
      );

      const game = await this.service.createGame(session.user.id, body);
      return successResponse(game, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid")) {
        return errorResponse(error.message, 400);
      }
      console.error("Error creating game:", error);
      return errorResponse("Internal server error", 500);
    }
  }

  // oxlint-disable-next-line id-length
  private async validateRequest<T>(
    request: Request,
    schema: ZodSchema<T>
  ): Promise<T> {
    // oxlint-disable-next-line typescript/no-unsafe-assignment
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const { issues } = result.error;
      throw new Error(issues[0]?.message ?? "Invalid request");
    }

    return result.data;
  }
}
