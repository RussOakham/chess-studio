// Data-access layer for moves - all database operations

import type { InferSelectModel } from "@repo/db";

import { asc, db, desc, eq, moves } from "@repo/db";

export type Move = InferSelectModel<typeof moves>;

export class MovesRepository {
  /**
   * Save a move to the database
   */
  async createMove(data: {
    gameId: string;
    moveNumber: number;
    moveSan: string;
    moveUci: string;
    fenBefore: string;
    fenAfter: string;
    evaluation?: number;
  }): Promise<Move> {
    const [newMove] = await db
      .insert(moves)
      .values({
        gameId: data.gameId,
        moveNumber: data.moveNumber,
        moveSan: data.moveSan,
        moveUci: data.moveUci,
        fenBefore: data.fenBefore,
        fenAfter: data.fenAfter,
        evaluation: data.evaluation,
      })
      .returning();

    if (!newMove) {
      throw new Error("Failed to create move");
    }

    return newMove;
  }

  /**
   * Get all moves for a game, ordered by move number (ascending)
   */
  async findByGameId(gameId: string): Promise<Move[]> {
    return db
      .select()
      .from(moves)
      .where(eq(moves.gameId, gameId))
      .orderBy(asc(moves.moveNumber));
  }

  /**
   * Get the last move number for a game (to calculate next move number)
   */
  async getLastMoveNumber(gameId: string): Promise<number> {
    const result = await db
      .select({ moveNumber: moves.moveNumber })
      .from(moves)
      .where(eq(moves.gameId, gameId))
      .orderBy(desc(moves.moveNumber))
      .limit(1);

    return result[0]?.moveNumber ?? 0;
  }
}
