import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pencil Box",
  description: "Stationery, gifts, printing and photocopy",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#12296b" };

/** Runs before the first paint so the page never flashes the wrong theme. Light is the default. */
const THEME_SCRIPT = `try{document.documentElement.dataset.theme=localStorage.getItem('pb_theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Suspense: Ant Design's provider tree reads Math.random(), which Next.js 16 only allows at request time */}
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
        <Suspense fallback={null}>
          <Analytics />
          <SpeedInsights />
        </Suspense>
      </body>
    </html>
  );
}
