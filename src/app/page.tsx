import type { Metadata } from "next";
import { Storefront } from "./storefront";

export const metadata: Metadata = {
  title: "Pencil Box · Stationery, Gifts, Printing & Photocopy",
  description: "Browse notebooks, pens, art and craft, school supplies and more. Add to cart and order on WhatsApp. Pick up from the shop.",
};

export default function Home() {
  return <Storefront />;
}
