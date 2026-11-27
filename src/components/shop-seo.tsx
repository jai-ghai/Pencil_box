import Link from "next/link";
import {
  ADDRESS_LINE,
  COLLECTIONS,
  HOURS_LABEL,
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

/** H1, one intro line, and crawlable category links. Address and hours live in the footer. */
export function ShopHero({ title, lede, current }: { title: string; lede: string; current?: string | null }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pb-1 pt-3">
      <h1 className="border-l-4 pl-2 text-[1.05rem] font-bold leading-tight tracking-tight sm:text-xl" style={{ borderColor: "var(--pb-sun)" }}>
        {title}
      </h1>
      <p className="pb-seo-muted mt-1 max-w-3xl text-sm leading-snug">{lede}</p>
      <nav aria-label="Shop categories" className="mt-2 flex flex-wrap gap-1.5">
        <Link href="/" aria-current={current ? undefined : "page"} className="pb-seo-chip">
          All
        </Link>
        {COLLECTIONS.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} aria-current={current === c.slug ? "page" : undefined} className="pb-seo-chip">
            {c.nav}
          </Link>
        ))}
      </nav>
    </header>
  );
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
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6">
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
          <a className="pb-seo-link" href={MAPS_URL}>
            Get directions
          </a>
          <a className="pb-seo-link" href={REVIEW_URL}>
            Review us on Google
          </a>
        </p>
      </div>
    </footer>
  );
}
