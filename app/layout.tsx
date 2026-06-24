import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

const description =
  "Where on Earth is this? A daily satellite guessing game. Read the clue, drop a pin, and reveal more only if you need it. New place every day.";

export const metadata: Metadata = {
  // Change to your real domain (or set NEXT_PUBLIC_SITE_URL) so share previews
  // resolve absolute image URLs.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://zoomout.game",
  ),
  title: "ZoomOut — the daily satellite puzzle",
  description,
  openGraph: {
    title: "ZoomOut — the daily satellite puzzle",
    description,
    type: "website",
    siteName: "ZoomOut",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZoomOut — the daily satellite puzzle",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
