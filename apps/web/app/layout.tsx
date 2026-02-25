import { ConvexClientProvider } from "@/app/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getToken } from "@/lib/auth-server";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";

// oxlint-disable-next-line import/no-unassigned-import
import "./globals.css";

// oxlint-disable-next-line new-cap
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Chess Studio",
  description: "AI-driven chess game application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let token: string | null = null;
  try {
    token = (await getToken()) ?? null;
  } catch {
    // Fall back to client-side auth flow
  }
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ConvexClientProvider initialToken={token}>
            {children}
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
