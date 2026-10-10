import type { Metadata } from "next";

const title = "Between the Lines | More than the score.";
const description =
  "Football insights that go deeper. Explore patterns, decisions, and stories behind the score through evidence-backed insights and interactive synthetic match replays.";

// Existing deployment, not a new brand domain. Operators can override per host.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.APP_URL ||
  "https://second-look.sybgm6dkhk.workers.dev";

export const brandMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Between the Lines",
  title: { default: title, template: "%s | Between the Lines" },
  description,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BTL",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      ...[16, 32, 48].map((size) => ({
        url: `/favicon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
      })),
    ],
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#15803d" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Between the Lines",
    url: "/",
    title,
    description,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Between the Lines. More than the score. A tactical passing route crosses a football pitch.",
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
        alt: "Between the Lines. More than the score. Football insights that go deeper.",
      },
    ],
  },
};
