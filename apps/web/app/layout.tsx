import { ConvexClientProvider } from "@/app/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getToken } from "@/lib/auth-server";
import { brand } from "@/lib/copy";
import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Roboto } from "next/font/google";

// oxlint-disable-next-line import/no-unassigned-import
import "./globals.css";

// oxlint-disable-next-line new-cap
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-roboto",
});

// oxlint-disable-next-line new-cap
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-serif",
});

// oxlint-disable-next-line new-cap
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
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
    <html
      lang="en"
      className={`${roboto.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>
            <ConvexClientProvider initialToken={token}>
              {children}
            </ConvexClientProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
