import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Google Search Console HTML-tag verification. Set NEXT_PUBLIC_GSC_VERIFICATION in Vercel
 * to the content value only (not the whole meta tag), then redeploy. Empty means no tag.
 */
const gscVerification = process.env.NEXT_PUBLIC_GSC_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pencilbox.store"),
  title: {
    default: "Pencil Box Stationery",
    template: "%s · Pencil Box Stationery",
  },
  applicationName: "Pencil Box Stationery",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pencil Box",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  ...(gscVerification ? { verification: { google: gscVerification } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12296b",
  viewportFit: "cover",
};

/** Runs before the first paint so the page never flashes the wrong theme. Light is the default. */
const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem('pb_theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Suspense fallback={null}>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
}
