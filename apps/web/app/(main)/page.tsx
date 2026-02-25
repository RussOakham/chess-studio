import { ConvexUserBadge } from "@/components/auth/convex-user-badge";
import { HomeGamesList } from "@/components/home/home-games-list";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth-server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-background">
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Chess Studio</h1>
            <p className="mt-1 text-muted-foreground">
              Welcome back, {session.user.name || session.user.email}!
            </p>
            <p className="mt-0.5">
              <ConvexUserBadge />
            </p>
          </div>
          <Link href="/game/new">
            <Button size="lg">New Game</Button>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="space-y-8 py-4">
              <p className="text-muted-foreground">Loading games…</p>
            </div>
          }
        >
          <HomeGamesList />
        </Suspense>
      </main>
    </div>
  );
}
