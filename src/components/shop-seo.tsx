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
    <footer className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8">
      <div className="pb-seo-card px-4 py-4 text-[15px] leading-relaxed">
        <address className="not-italic">
          <strong className="block text-base">{SHOP_NAME}</strong>
          <span className="pb-seo-muted">{ADDRESS_LINE}</span>
          <br />
          <a className="pb-seo-link" href={`tel:${PHONE_TEL}`}>
            {PHONE_DISPLAY}
          </a>
        </address>
        <p className="mt-2 font-semibold">{HOURS_LABEL}</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <a className="pb-seo-link" href={MAPS_URL}>Get directions</a>
          <a className="pb-seo-link" href={REVIEW_URL}>Review us on Google</a>
          <a className="pb-seo-link" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="pb-seo-link inline-flex items-center gap-1.5" href={INSTAGRAM_URL} rel="me noopener noreferrer" target="_blank">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10a2.2 2.2 0 0 0 2.2-2.2V7A2.2 2.2 0 0 0 17 4.8zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.35 6.4a.95.95 0 1 1-.95.95.95.95 0 0 1 .95-.95z" />
            </svg>
            Instagram
          </a>
        </p>
        <nav aria-label="Shop categories" className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {COLLECTIONS.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} className="pb-seo-link">{c.nav}</Link>
          ))}
        </nav>
        <div className="pb-seo-muted mt-4 text-sm leading-relaxed">
          <p>Fixed price on stationery. No bargaining.</p>
          <p>No return or exchange on toys and electronics.</p>
          <p className="mt-2">Pickup from the shop. The price on the bill is the price you pay.</p>
        </div>
      </div>
    </footer>
  );
}
