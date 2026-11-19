import type { MetadataRoute } from "next";

/**
 * Web App Manifest. Next.js serves this at /manifest.webmanifest and links it from <head>.
 * With display:standalone the phone home-screen icon opens the shop without a browser chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pencil Box",
    short_name: "Pencil Box",
    description: "Stationery, gifts, printing and photocopy",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#12296b",
    theme_color: "#12296b",
    categories: ["shopping", "business"],
    /** long-press the installed icon: jump straight to staff screens */
    shortcuts: [
      { name: "Admin — Today", url: "/admin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Billing counter", url: "/pos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
