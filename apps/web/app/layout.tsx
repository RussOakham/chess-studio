import type { Metadata } from "next";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="font-sans antialiased">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
