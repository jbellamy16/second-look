import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Second Look — The game, understood.",
  description:
    "You saw the game. Here’s what you missed. Explainable football intelligence built on synthetic match events.",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
