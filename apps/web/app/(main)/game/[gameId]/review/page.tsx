import { api } from "@/convex/_generated/api";
import { isConvexAuthError } from "@/lib/auth-error";
import { authServer, getSession } from "@/lib/auth-server";
import { toGameId } from "@/lib/convex-id";
import { notFound, redirect } from "next/navigation";

import { ReviewPageClient } from "./review-page-client";

interface ReviewPageProps {
  params: Promise<{ gameId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { gameId } = await params;

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
    if (error instanceof Error && /not found|404/i.test(error.message)) {
      notFound();
    }
    throw error;
  }

  return <ReviewPageClient gameId={gameId} />;
}
