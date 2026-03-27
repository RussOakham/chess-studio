import { GamesListClient } from "@/components/game/games-list-client";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { getSession } from "@/lib/auth-server";
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
            <h1 className="text-3xl font-bold">Game History</h1>
            <p className="mt-1 text-muted-foreground">
              All your games, including active and completed.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
        <Suspense fallback={<PageLoading message="Loading games…" />}>
          <GamesListClient />
        </Suspense>
      </main>
    </div>
  );
}
