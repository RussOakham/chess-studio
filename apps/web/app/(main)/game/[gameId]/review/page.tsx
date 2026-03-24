import { api } from "@/convex/_generated/api";
import { isConvexAuthError } from "@/lib/auth-error";
import { authServer, getSession } from "@/lib/auth-server";
import {
  extractConvexErrorMessage,
  shouldNotFoundForGameLookup,
} from "@/lib/convex-fetch-error";
import { isPlausibleGameId, toGameId } from "@/lib/convex-id";
import { notFound, redirect } from "next/navigation";

import { ReviewPageClient } from "./review-page-client";

interface ReviewPageProps {
  params: Promise<{ gameId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = await params;
  const rawGameId = resolvedParams.gameId;
  const gameId =
    typeof rawGameId === "string" ? rawGameId.trim() : String(rawGameId);
  if (!isPlausibleGameId(gameId)) {
    notFound();
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    await authServer.fetchAuthQuery(api.games.getById, {
      gameId: toGameId(gameId),
    });
  } catch (error) {
    if (isConvexAuthError(error)) {
      redirect("/login");
    }
    if (shouldNotFoundForGameLookup(extractConvexErrorMessage(error))) {
      notFound();
    }
    throw error;
  }

  const userDisplayName = session.user.name ?? session.user.email ?? "You";

  return <ReviewPageClient gameId={gameId} userDisplayName={userDisplayName} />;
}
