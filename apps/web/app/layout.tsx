import type { Metadata } from "next";

import { ConvexClientProvider } from "@/app/convex-client-provider";
import { getToken } from "@/lib/auth-server";
import { TRPCProvider } from "@/lib/trpc/provider";
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
  const token = await getToken();
  return (
    <html lang="en" className={roboto.variable}>
      <body className="font-sans antialiased">
        <ConvexClientProvider initialToken={token}>
          <TRPCProvider>{children}</TRPCProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
