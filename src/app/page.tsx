import type { Metadata } from "next";
import { Storefront } from "./storefront";

const title = "Pencil Box · Stationery, Gifts, Printing & Photocopy";
const description =
  "Browse notebooks, pens, art and craft, school supplies and more. Add to cart and order on WhatsApp. Pick up from the shop.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Pencil Box",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Pencil Box" }],
  },
  twitter: { card: "summary", title, description },
};

export default function Home() {
  return <Storefront />;
}
