import { auth } from "@/lib/auth";
import { INITIAL_FEN } from "@repo/chess";
import { and, db, desc, eq, games, or } from "@repo/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch active games (in_progress or waiting)
    const activeGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.userId, userId),
          or(eq(games.status, "in_progress"), eq(games.status, "waiting"))
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(10);

    // Fetch recent games (completed or abandoned, last 5)
    const recentGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.userId, userId),
          or(eq(games.status, "completed"), eq(games.status, "abandoned"))
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(5);

    return NextResponse.json({
      activeGames,
      recentGames,
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion
    const body = (await request.json()) as {
      difficulty?: string;
      color?: string;
    };
    const { difficulty, color } = body;

    // Validate input
    if (!difficulty || !["easy", "medium", "hard"].includes(difficulty)) {
      return NextResponse.json(
        { error: "Invalid difficulty level" },
        { status: 400 }
      );
    }

    if (!color || !["white", "black", "random"].includes(color)) {
      return NextResponse.json(
        { error: "Invalid color selection" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Create game with initial FEN position
    const [newGame] = await db
      .insert(games)
      .values({
        userId,
        status: "waiting",
        fen: INITIAL_FEN,
      })
      .returning();

    if (!newGame) {
      return NextResponse.json(
        { error: "Failed to create game" },
        { status: 500 }
      );
    }

    // TODO: Store difficulty and color preferences when schema is extended
    // For now, we'll use these when implementing the engine in Phase 2

    return NextResponse.json(
      {
        id: newGame.id,
        status: newGame.status,
        fen: newGame.fen,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
