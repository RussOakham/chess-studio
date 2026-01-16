// Service layer for games - business logic and orchestration

import type { Game, GamesRepository } from "@/lib/data-access/games.repository";
import type { MovesRepository } from "@/lib/data-access/moves.repository";
import type { CreateGameRequest, ListGamesResponse } from "@/lib/types/api";

import { INITIAL_FEN } from "@repo/chess";
import { Chess } from "chess.js";

export class GamesService {
  constructor(
    private repository: GamesRepository,
    private movesRepository?: MovesRepository
  ) {}

  async listUserGames(userId: string): Promise<ListGamesResponse> {
    const [activeGames, recentGames] = await Promise.all([
      this.repository.findActiveGamesByUserId(userId),
      this.repository.findRecentGamesByUserId(userId),
    ]);

    return { activeGames, recentGames };
  }

  async createGame(
    userId: string,
    _options: CreateGameRequest
  ): Promise<Pick<Game, "id" | "status" | "fen">> {
    // Business logic: determine initial state, validate rules
    // For engine games, start immediately (no waiting for opponent)
    const game = await this.repository.createGame({
      userId,
      fen: INITIAL_FEN,
      status: "in_progress", // Start game immediately for engine games
    });

    // TODO: Store difficulty/color when schema is extended
    // For now, we'll use these when implementing the engine in Phase 2

    return {
      id: game.id,
      status: game.status,
      fen: game.fen,
    };
  }

  /**
   * Execute a move in a game
   * Validates the move, saves it to the database, and updates the game state
   */
  async makeMove(
    userId: string,
    gameId: string,
    from: string,
    to: string,
    promotion?: string
  ): Promise<{
    success: boolean;
    game: Game;
    move: {
      from: string;
      to: string;
      san: string;
      uci: string;
    };
  }> {
    // Verify game exists and user owns it
    const game = await this.repository.findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }
    if (game.userId !== userId) {
      throw new Error("You do not have access to this game");
    }
    if (game.status !== "in_progress") {
      throw new Error("Game is not in progress");
    }

    // Load current position into chess.js
    const chess = new Chess();
    try {
      chess.load(game.fen);
    } catch {
      throw new Error("Invalid game position", {
        cause: "Failed to load FEN position into chess.js",
      });
    }

    // Validate and execute the move
    const move = chess.move({
      from,
      to,
      promotion:
        promotion === "q" ||
        promotion === "r" ||
        promotion === "b" ||
        promotion === "n"
          ? promotion
          : undefined,
    });

    if (!move) {
      throw new Error("Invalid move");
    }

    // Get FEN before and after the move
    const fenBefore = game.fen;
    const fenAfter = chess.fen();

    // Calculate move number (get last move number + 1)
    const lastMoveNumber = this.movesRepository
      ? await this.movesRepository.getLastMoveNumber(gameId)
      : 0;
    const moveNumber = lastMoveNumber + 1;

    // Save move to database
    if (this.movesRepository) {
      await this.movesRepository.createMove({
        gameId,
        moveNumber,
        moveSan: move.san,
        moveUci: move.from + move.to + (move.promotion ?? ""),
        fenBefore,
        fenAfter,
      });
    }

    // Update game FEN and PGN
    const pgn = chess.pgn();

    // Check if game is over
    // Note: After a move, chess.turn() returns the NEXT player's turn
    // So if it's checkmate, the player who just moved won
    const { status: currentStatus, result: currentResult } = game;
    let status: "waiting" | "in_progress" | "completed" | "abandoned" =
      currentStatus;
    let result = currentResult;
    if (chess.isCheckmate()) {
      status = "completed";
      // The player who just moved (opposite of current turn) won
      result = chess.turn() === "w" ? "black_wins" : "white_wins";
    } else if (chess.isDraw() || chess.isStalemate()) {
      status = "completed";
      result = "draw";
    }

    // Update game in database
    const updatedGame = await this.repository.updateGame(gameId, {
      fen: fenAfter,
      pgn,
      status,
      result,
    });

    return {
      success: true,
      game: updatedGame,
      move: {
        from: move.from,
        to: move.to,
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ""),
      },
    };
  }
}
