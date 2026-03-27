import { GamesListClient } from "@/components/game/games-list-client";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { getSession } from "@/lib/auth-server";
import { gameList, loading } from "@/lib/copy";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function GamesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-background">
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{gameList.gamesPage.title}</h1>
            <p className="mt-1 text-muted-foreground">
              {gameList.gamesPage.subtitle}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">{gameList.gamesPage.backToHome}</Button>
          </Link>
        </div>
        <Suspense fallback={<PageLoading message={loading.games} />}>
          <GamesListClient />
        </Suspense>
      </main>
    </div>
  );
}
