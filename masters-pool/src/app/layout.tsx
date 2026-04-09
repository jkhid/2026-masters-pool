import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2026 Masters Pool",
  description: "Masters Golf Pool Leaderboard — Augusta National 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
