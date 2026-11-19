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

/** Must match the Google Business Profile exactly (name/address/phone) — it ties the website to the map listing. */
const SHOP = {
  name: "Pencil Box",
  street: "B-92, Block B, Tigri Extension",
  city: "New Delhi",
  state: "Delhi",
  pin: "110062",
  site: "https://pencil-box-ochre.vercel.app",
};

function jsonLd() {
  const digits = (process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const tel = digits ? `+${digits.length === 10 ? `91${digits}` : digits}` : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "OfficeEquipmentStore",
    name: SHOP.name,
    description,
    url: SHOP.site,
    telephone: tel,
    priceRange: "\u20b9",
    paymentAccepted: "Cash, UPI",
    address: {
      "@type": "PostalAddress",
      streetAddress: SHOP.street,
      addressLocality: SHOP.city,
      addressRegion: SHOP.state,
      postalCode: SHOP.pin,
      addressCountry: "IN",
    },
    knowsAbout: [
      "stationery",
      "school supplies",
      "notebooks",
      "pens and pencils",
      "art and craft supplies",
      "gift items",
      "return gifts",
      "toys",
      "photocopying",
      "printing",
    ],
  };
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <Storefront />
    </>
  );
}
