import { ConvexUserBadge } from "@/components/auth/convex-user-badge";
import { HomeGamesList } from "@/components/home/home-games-list";
import { buttonVariants } from "@/components/ui/button-variants";
import { PageLoading } from "@/components/ui/page-loading";
import { getSession } from "@/lib/auth-server";
import { home, loading } from "@/lib/copy";
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
            <h1 className="text-4xl font-bold">{home.heroTitle}</h1>
            <p className="mt-1 text-muted-foreground">
              {home.welcomeBack(session.user.name || session.user.email)}
            </p>
            <p className="mt-0.5">
              <ConvexUserBadge />
            </p>
          </div>
          <Link href="/game/new" className={buttonVariants({ size: "lg" })}>
            {home.newGameCta}
          </Link>
        </div>

        <Suspense fallback={<PageLoading message={loading.games} />}>
          <HomeGamesList />
        </Suspense>
      </main>
    </div>
  );
}
