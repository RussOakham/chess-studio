"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

const storageKey = "chess-studio-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
