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
  site: "https://www.pencilbox.store",
};

function shopTel() {
  const digits = (process.env.WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return digits ? `+${digits.length === 10 ? `91${digits}` : digits}` : undefined;
}

function jsonLd() {
  const tel = shopTel();
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
  const tel = shopTel();
  const telDisplay = tel ? `+91 ${tel.slice(3, 8)} ${tel.slice(8)}` : null;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <Storefront />
      {/* Server-rendered NAP: visible in plain HTML so Google can match the business listing without running JS */}
      <footer style={{ textAlign: "center", padding: "0 16px 24px", fontSize: 13, lineHeight: 1.7 }}>
        <address style={{ fontStyle: "normal" }}>
          <strong>{SHOP.name}</strong>
          <br />
          {SHOP.street}, {SHOP.city}, {SHOP.state} {SHOP.pin}
          {tel && (
            <>
              <br />
              <a href={`tel:${tel}`}>{telDisplay}</a>
            </>
          )}
        </address>
      </footer>
    </>
  );
}
