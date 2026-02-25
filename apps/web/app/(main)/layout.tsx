import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return <AppShell session={session}>{children}</AppShell>;
}
