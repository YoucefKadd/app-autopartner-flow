import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "APFLOW — Auto Partner KAM",
  description:
    "Gestion épurée de portefeuille clients et prise de notes rapide pour Key Account Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen antialiased selection:bg-[#d90416] selection:text-white`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
