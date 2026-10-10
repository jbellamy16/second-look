import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./motion.css";
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

const title = "Second Look | Football beyond the score";
const description =
  "You saw the game. Here’s what you missed. Explainable football intelligence built on synthetic match events.";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.APP_URL ||
      "http://localhost:3000",
  ),
  applicationName: "Second Look",
  title,
  description,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#347CFF" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Second Look",
    title,
    description,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Second Look. The game behind the score.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: "/twitter-image.png",
        alt: "Second Look. The game behind the score.",
      },
    ],
  },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111416" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (() => {
            let appearance = 'system';
            try { appearance = localStorage.getItem('second-look-appearance'); } catch {}
            document.documentElement.dataset.theme =
              appearance === 'light' || appearance === 'dark' ? appearance :
              matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          })();
        `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
