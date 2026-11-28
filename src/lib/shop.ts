import type { Metadata } from "next";

/**
 * Public facts for Pencil Box Stationery. These are the strings Google should see in the
 * first HTML response, so this file stays free of database and request-time reads.
 */

export const SITE = "https://www.pencilbox.store";

export const HOME_TITLE = "Stationery Shop in Tigri Extension, South Delhi | Pencil Box";
export const HOME_DESCRIPTION =
  "School stationery, notebooks, chart paper, photocopy and kids’ toys near Sangam Vihar, Khanpur and Devli. Pencil Box, B-92 Tigri Extension, New Delhi 110062. Open daily 7 AM–9:30 PM.";
export const HOME_H1 = "Stationery shop in Tigri Extension";

export const SHOP_NAME = "Pencil Box Stationery";
export const SHOP_ALTERNATE_NAME = "Pencil Box";
export const STREET = "B-92, Block B, Tigri Extension";
export const LOCALITY = "New Delhi";
export const REGION = "Delhi";
export const POSTAL = "110062";
export const COUNTRY = "IN";
export const ADDRESS_LINE = `${STREET}, ${LOCALITY} ${POSTAL}`;

/** Display, tel: link, and schema each use the spacing Google Business Profile uses. */
export const PHONE_DISPLAY = "+91 96254 43053";
export const PHONE_TEL = "+919625443053";
export const PHONE_SCHEMA = "+91-96254-43053";
export const HOURS_LABEL = "Open daily 7:00 AM – 9:30 PM";

export const MAPS_URL = "https://www.google.com/maps/place/?q=place_id:ChIJo2mwYj_hDDkRzcnaRpeaLps";
export const REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJo2mwYj_hDDkRzcnaRpeaLps";
export const INSTAGRAM_URL = "https://www.instagram.com/pencilbox.stationery";

/**
 * Profiles that should show on the business. Copied into JSON-LD `sameAs`.
 * Add Justdial and Sulekha URLs here when you have them.
 */
export const SAME_AS: string[] = [MAPS_URL, INSTAGRAM_URL];

export const AREAS_SERVED = ["Tigri Extension", "Tigri", "Sangam Vihar", "Khanpur", "Devli", "South Delhi"] as const;

/**
 * Tigri, New Delhi 110062. OpenStreetMap’s point for the colony, used with the street address.
 * The door is B-92, Block B, Tigri Extension.
 */
export const GEO = { latitude: 28.5122, longitude: 77.2439 } as const;

/**
 * Per-page rates in rupees. Same figures as `SERVICES` in src/lib/seed-services.ts
 * (Photocopy ₹2, B&W printout ₹5, colour printout ₹10).
 */
export const PRINT_RATES = { photocopy: 2, blackAndWhite: 5, colour: 10 } as const;

/** Shop card for link previews. An original navy-and-yellow drawing, not the app icon. */
export const OG_IMAGE = {
  url: "/og/shop-card.png",
  width: 1200,
  height: 630,
  alt: "Pencil Box stationery shop in Tigri Extension",
} as const;

const LOGO_PATH = "/og/shop-card.png";

export interface FaqItem {
  q: string;
  a: string;
}

export function faqItems(): FaqItem[] {
  const { photocopy, blackAndWhite, colour } = PRINT_RATES;
  return [
    {
      q: "Photocopy/printout milta hai?",
      a: `Yes. Photocopy ₹${photocopy}/page, B&W printout ₹${blackAndWhite}, colour printout ₹${colour}. Phone, WhatsApp or pen drive se bhi print kar dete hain.`,
    },
    {
      q: "Return gifts milte hain?",
      a: "Yes, birthday return gifts and party items milte hain.",
    },
    {
      q: "Chart paper?",
      a: "Yes, chart paper, A4/A3 sheets, colour sheets.",
    },
    {
      q: "Sunday ko khula hai?",
      a: "Yes, every day 7 AM–9:30 PM. Sunday bhi khula rehta hai.",
    },
    {
      q: "School/office bulk orders?",
      a: `Yes, we take bulk orders for schools and offices. Call or WhatsApp ${PHONE_DISPLAY}.`,
    },
    {
      q: "Soft toys?",
      a: "Yes, soft toys, plush and kids' toys milte hain.",
    },
    {
      q: "Brands?",
      a: "Yes. DOMS, Flair, Luxor, Nataraj, Apsara and more.",
    },
    {
      q: "Kahan hai?",
      a: `${STREET}, ${LOCALITY} ${POSTAL}, near Sangam Vihar, Khanpur and Devli.`,
    },
  ];
}

export interface ShopCollection {
  slug: string;
  /** Top-level category `name_en` from the catalogue. */
  match: string;
  nav: string;
  title: string;
  h1: string;
  description: string;
  lede: string;
}

const place = "Pencil Box Stationery, B-92 Tigri Extension, New Delhi 110062. Open daily 7 AM–9:30 PM.";

export const COLLECTIONS: ShopCollection[] = [
  {
    slug: "notebooks",
    match: "Notebooks & Registers",
    nav: "Notebooks",
    title: "Notebooks & Registers in Tigri Extension | Pencil Box",
    h1: "Notebook and register shop in Tigri Extension",
    description: `School notebooks and registers near Sangam Vihar, Khanpur and Devli. ${place}`,
    lede: "School notebooks and registers. Sangam Vihar, Khanpur aur Devli ke paas — copies, registers, sab isi dukaan pe.",
  },
  {
    slug: "pens",
    match: "Pens & Pencils",
    nav: "Pens & pencils",
    title: "Pens and Pencils in Tigri Extension | Pencil Box",
    h1: "Pens and pencils in Tigri Extension",
    description: `Ball pens, gel pens, pencils, erasers and sharpeners for school. ${place}`,
    lede: "Ball pens, gel pens, pencils, erasers and sharpeners. DOMS, Nataraj, Apsara and more, Tigri Extension mein.",
  },
  {
    slug: "art",
    match: "Art & Craft",
    nav: "Art & craft",
    title: "Chart Paper & Art Supplies in Tigri Extension | Pencil Box",
    h1: "Chart paper and art supplies near Sangam Vihar",
    description: `Chart paper, colours and craft supplies in Tigri Extension, near Sangam Vihar. ${place}`,
    lede: "Chart paper, colours, crayons and craft supplies for school projects. One shop in Tigri Extension.",
  },
  {
    slug: "school",
    match: "School Supplies",
    nav: "School supplies",
    title: "School Stationery near Sangam Vihar | Pencil Box",
    h1: "School stationery in Tigri Extension",
    description: `Glue, markers, covers and the rest of the school list near Sangam Vihar and Khanpur. ${place}`,
    lede: "Glue, markers, covers, maps and the rest of the school list. B-92, Tigri Extension.",
  },
  {
    slug: "gifts",
    match: "Gifts & More",
    nav: "Gifts",
    title: "Birthday Return Gifts in Tigri Extension | Pencil Box",
    h1: "Gift shop near Sangam Vihar and Tigri",
    description: `Birthday return gifts and small party items near Sangam Vihar, Khanpur and Devli. ${place}`,
    lede: "Birthday return gifts, soft toys and party items. Sangam Vihar, Khanpur aur Devli ke paas.",
  },
  {
    slug: "printing",
    match: "Printing & Photocopy",
    nav: "Printing",
    title: "Photocopy & Printout near Tigri Extension | Pencil Box",
    h1: "Photocopy and printout near Sangam Vihar",
    description: `Photocopy ₹${PRINT_RATES.photocopy}/page, B&W printout ₹${PRINT_RATES.blackAndWhite}, colour ₹${PRINT_RATES.colour}. Phone, WhatsApp or pen drive. ${place}`,
    lede: `Photocopy ₹${PRINT_RATES.photocopy} a page, B&W printout ₹${PRINT_RATES.blackAndWhite}, colour printout ₹${PRINT_RATES.colour}. Phone, WhatsApp ya pen drive. Roz 7 AM–9:30 PM.`,
  },
];

/** Titles for shelves that are not one of the six main collections. */
export const SHELF_SEO: Record<string, { title: string; h1: string; description: string }> = {
  toys: {
    title: "Toy Shop in Tigri Extension | Pencil Box",
    h1: "Kids toys in Tigri Extension",
    description: "A small toy shelf at Pencil Box, B-92 Tigri Extension, near Sangam Vihar, Khanpur and Devli. Ask what is in today. Open daily 7 AM–9:30 PM.",
  },
};

export function shelfMeta(slug: string, label: string, about: string): { title: string; h1: string; description: string } {
  return SHELF_SEO[slug] ?? {
    title: `${label} in Tigri Extension | Pencil Box`,
    h1: label,
    description: about.replace(/\s+/g, " ").trim().slice(0, 160),
  };
}

export function collectionBySlug(slug: string): ShopCollection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}

export function collectionByMatch(name: string): ShopCollection | undefined {
  return COLLECTIONS.find((c) => c.match === name);
}

/** Top-level category name encoded in `/c/<slug>`, or null on any other path. */
export function categoryMatchFromPath(pathname: string): string | null {
  const match = /^\/c\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  return collectionBySlug(decodeURIComponent(match[1]))?.match ?? null;
}

export function canonicalUrl(path: string): string {
  return path === "/" ? `${SITE}/` : `${SITE}${path}`;
}

export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const url = canonicalUrl(path);
  return {
    title: { absolute: title },
    description,
    // The metadata resolver drops a trailing slash on the site root, so the homepage
    // canonical is a real <link> in the page instead (https://www.pencilbox.store/).
    ...(path === "/" ? {} : { alternates: { canonical: url } }),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: SHOP_NAME,
      images: [{ ...OG_IMAGE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function storeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Store", "LocalBusiness"],
    name: SHOP_NAME,
    alternateName: SHOP_ALTERNATE_NAME,
    url: canonicalUrl("/"),
    telephone: PHONE_SCHEMA,
    image: `${SITE}${LOGO_PATH}`,
    logo: `${SITE}${LOGO_PATH}`,
    priceRange: "₹",
    paymentAccepted: "Cash, UPI",
    address: {
      "@type": "PostalAddress",
      streetAddress: STREET,
      addressLocality: LOCALITY,
      addressRegion: REGION,
      postalCode: POSTAL,
      addressCountry: COUNTRY,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAYS,
        opens: "07:00",
        closes: "21:30",
      },
    ],
    hasMap: MAPS_URL,
    geo: { "@type": "GeoCoordinates", latitude: GEO.latitude, longitude: GEO.longitude },
    areaServed: AREAS_SERVED.map((name) => ({ "@type": "Place", name })),
    sameAs: [...SAME_AS],
  };
}

export function faqJsonLd(items: FaqItem[] = faqItems()) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
