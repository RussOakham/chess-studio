import { auth } from "@/lib/auth";
import { GamesController } from "@/lib/controllers/games.controller";
import { GamesRepository } from "@/lib/data-access/games.repository";
import { GamesService } from "@/lib/services/games.service";
import { errorResponse } from "@/lib/utils/api-response";
import { headers } from "next/headers";

const repository = new GamesRepository();
const service = new GamesService(repository);
const controller = new GamesController(service, auth);

export async function GET() {
  try {
    return await controller.listGames(await headers());
  } catch (error) {
    console.error("Error in GET /api/games:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    return await controller.createGame(request, await headers());
  } catch (error) {
    console.error("Error in POST /api/games:", error);
    return errorResponse("Internal server error", 500);
  }
}
