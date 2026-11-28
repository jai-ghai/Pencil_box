import Link from "next/link";
import {
  ADDRESS_LINE,
  COLLECTIONS,
  HOURS_LABEL,
  INSTAGRAM_URL,
  MAPS_URL,
  PHONE_DISPLAY,
  PHONE_TEL,
  REVIEW_URL,
  SHOP_NAME,
  faqItems,
  faqJsonLd,
  jsonLdScript,
  storeJsonLd,
} from "@/lib/shop";

/** Both schema blocks. Rendered outside the client catalogue so they are in the first HTML. */
export function ShopJsonLd() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(storeJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }} />
    </>
  );
}

/**
 * Address strip above the shop header, plus the page H1.
 * On the home page the H1 is visually hidden (sr-only, not display:none) so it stays in the HTML for search and screen readers without repeating the logo.
 */
/** Page H1. Home keeps it for search engines without showing a second title under the logo. */
export function ShopHero({ title, hideTitle = false }: { title: string; hideTitle?: boolean }) {
  return <h1 className={hideTitle ? "pb-sr-only" : "text-lg font-extrabold leading-snug"}>{title}</h1>;
}

export function ShopFaq() {
  return (
    <section aria-labelledby="shop-faq" className="mx-auto w-full max-w-6xl px-4 pt-8">
      <h2 id="shop-faq" className="text-lg font-extrabold">
        Common questions
      </h2>
      <dl className="mt-3 flex flex-col gap-4">
        {faqItems().map((item) => (
          <div key={item.q}>
            <dt className="font-bold leading-snug">{item.q}</dt>
            <dd className="pb-seo-muted mt-1 text-[15px] leading-relaxed">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ShopFooter() {
  const whatsapp = `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}`;
  return (
    <footer className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-8 xl:px-6 xl:pb-10">
      <div className="pb-seo-card grid gap-6 px-4 py-5 text-[15px] leading-relaxed sm:grid-cols-2 xl:grid-cols-4 xl:px-6">
        <div>
          <strong className="block text-base">{SHOP_NAME}</strong>
          <p className="pb-seo-muted mt-2">A stationery counter in Tigri Extension. School lists, art supplies, gifts, photocopy and print.</p>
          <div className="pb-seo-muted mt-3 text-sm leading-relaxed">
            <p>Fixed price on stationery. No bargaining.</p>
            <p>No return or exchange on toys and electronics.</p>
          </div>
        </div>
        <nav aria-label="Shop categories">
          <p className="font-extrabold">Categories</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {COLLECTIONS.map((c) => (
              <li key={c.slug}><Link href={`/c/${c.slug}`} className="pb-seo-link">{c.nav}</Link></li>
            ))}
          </ul>
        </nav>
        <address className="not-italic">
          <p className="font-extrabold">Contact</p>
          <span className="pb-seo-muted mt-2 block">{ADDRESS_LINE}</span>
          <a className="pb-seo-link mt-1 inline-block" href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a className="pb-seo-link" href={MAPS_URL}>Map</a>
            <a className="pb-seo-link" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a className="pb-seo-link" href={INSTAGRAM_URL} rel="me noopener noreferrer" target="_blank">Instagram</a>
          </p>
        </address>
        <div>
          <p className="font-extrabold">Hours</p>
          <p className="mt-2 font-semibold">{HOURS_LABEL}</p>
          <p className="pb-seo-muted mt-2 text-sm">Sunday is a working day.</p>
          <a className="pb-seo-link mt-2 inline-block" href={REVIEW_URL}>Review us on Google</a>
        </div>
      </div>
    </footer>
  );
}
