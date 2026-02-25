"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { ServerSession } from "@/lib/auth-server";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppShellProps {
  session: ServerSession;
  children: React.ReactNode;
}

function NavLinks() {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/games", label: "Games" },
    { href: "/game/new", label: "New Game" },
  ];
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(({ href, label }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href}>
            <Button
              variant={active ? "secondary" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              {label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ session, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Link href="/" className="font-semibold text-sidebar-foreground">
            Chess Studio
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-sidebar-foreground">
              {session.user.name || session.user.email}
            </span>
            <ThemeToggle />
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
