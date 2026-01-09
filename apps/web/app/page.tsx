import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-8 p-8">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-4xl font-bold">Chess Studio</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}!
          </p>
        </div>
        <SignOutButton />
      </main>
    </div>
  );
}
