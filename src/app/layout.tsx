import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imposter - The Word Guessing Party Game",
  description:
    "A fun multiplayer word guessing game. One player is the imposter who doesn't know the secret word. Can you figure out who it is?",
  openGraph: {
    title: "Imposter - The Word Guessing Party Game",
    description: "Join the game and find the imposter!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh flex flex-col bg-background text-foreground antialiased">
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
