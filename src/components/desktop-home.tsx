import Link from "next/link";
import { HOME_DRAWING } from "@/components/home-drawings";
import { HeroFrame } from "@/components/desktop-hero";
import { orderedHomeLinks } from "@/lib/departments";
import { HOME_H1, HOURS_LABEL, PHONE_TEL, REVIEW_URL } from "@/lib/shop";

const NEEDS = [
  { slug: "school", title: "School", text: "Bags, books and the list the teacher sent.", href: "/c/school" },
  { slug: "office", title: "Office", text: "Files, staplers and a desk that can start the day.", href: "/c/office" },
  { slug: "art", title: "Art & craft", text: "Colours, clay and paper for the project tonight.", href: "/c/art" },
  { slug: "gifts", title: "Gifts", text: "Small return gifts for a class or a birthday.", href: "/c/gifts" },
] as const;

/** Desktop homepage. Categories and offers only — the product shelves live on their own pages. */
export function DesktopHome() {
  const cards = orderedHomeLinks();
  const wa = `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}`;
  return (
    <div className="hidden xl:block">
      <h1 className="pb-sr-only">{HOME_H1}</h1>
      <HeroFrame>
        <Slide
          kicker="For the school bag"
          title="School & office stationery"
          text="Notebooks, pens, files and the rest of a working desk."
          href="/c/school"
          cta="Shop now"
          drawing={HOME_DRAWING.notebooks}
        />
        <Slide
          kicker="For the project"
          title="Art & craft"
          text="Colours, brushes, clay and sheets for the work due tomorrow."
          href="/c/art"
          cta="Shop now"
          drawing={HOME_DRAWING.art}
        />
        <Slide
          kicker="For the party"
          title="Gifts"
          text="Return gifts and small surprises, packed from the same counter."
          href={wa}
          cta="Order on WhatsApp"
          drawing={HOME_DRAWING.gifts}
          external
        />
      </HeroFrame>

      <ul className="mt-4 grid grid-cols-4 gap-3">
        {[
          ["Free home delivery nearby", "Around Tigri, Sangam Vihar, Khanpur and Devli."],
          ["Best prices", "The price on the shelf is the price you pay."],
          ["Trusted local shop", "A counter the colony already knows."],
          [HOURS_LABEL, "Every day, Sunday included."],
        ].map(([title, text]) => (
          <li key={title} className="rounded-[12px] border border-black/10 bg-white px-3 py-3">
            <p className="text-sm font-extrabold text-[#153a7a]">{title}</p>
            <p className="mt-1 text-xs leading-snug text-[#5a6a82]">{text}</p>
          </li>
        ))}
      </ul>

      <section className="mt-8" aria-labelledby="bulk-offers">
        <h2 id="bulk-offers" className="text-xl font-extrabold text-[#0c1222]">Bulk and school orders</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <article className="rounded-[16px] bg-[#153a7a] p-5 text-white">
            <p className="text-lg font-extrabold">School and office lists</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-white/80">Send the list on WhatsApp. We pack notebooks, pens and files for a class or a desk.</p>
            <a className="mt-4 inline-flex rounded-full bg-[#ecc233] px-4 py-2 text-sm font-extrabold text-[#0a1628] no-underline" href={wa}>Order on WhatsApp</a>
          </article>
          <article className="rounded-[16px] border border-black/10 bg-white p-5">
            <p className="text-lg font-extrabold text-[#0c1222]">Photocopy and print</p>
            <p className="mt-1 text-sm leading-relaxed text-[#5a6a82]">Photocopy ₹2 a page, black & white print ₹5, colour print ₹10. Phone, WhatsApp or a pen drive.</p>
            <Link className="mt-4 inline-flex rounded-full bg-[#153a7a] px-4 py-2 text-sm font-extrabold text-white no-underline" href="/c/printing">Shop now</Link>
          </article>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="shop-need">
        <h2 id="shop-need" className="text-xl font-extrabold text-[#0c1222]">Shop by need</h2>
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {NEEDS.map((need) => (
            <li key={need.slug}>
              <Link href={need.href} className="block rounded-[14px] border border-black/10 bg-white p-3 no-underline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HOME_DRAWING[need.slug]} alt="" width={120} height={120} className="mx-auto h-24 w-24 object-contain" />
                <p className="mt-2 text-sm font-extrabold text-[#0c1222]">{need.title}</p>
                <p className="mt-1 text-xs leading-snug text-[#5a6a82]">{need.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="desk-cats">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="desk-cats" className="text-xl font-extrabold text-[#0c1222]">Browse the shelves</h2>
          <Link href="/categories" className="text-sm font-bold text-[#153a7a] no-underline">See all &gt;</Link>
        </div>
        <ul className="grid grid-cols-4 gap-3 2xl:grid-cols-6">
          {cards.map((card) => (
            <li key={card.slug} data-home-card={card.label.toLowerCase()}>
              <Link href={card.href} className="flex h-full flex-col overflow-hidden rounded-[14px] border border-black/10 bg-white no-underline">
                <span className="block aspect-square bg-[#f7f8fb]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={HOME_DRAWING[card.slug] ?? `/category/${card.slug}.svg`} alt="" width={240} height={240} className="h-full w-full object-contain" />
                </span>
                <span className="px-3 py-2 text-sm font-extrabold text-[#0c1222]">{card.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 flex items-center justify-between gap-6 rounded-[16px] bg-[#153a7a] px-6 py-5 text-white">
        <div>
          <h2 className="text-xl font-extrabold">Shopped with us?</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/80">A Google review helps the next parent find the shop. We read them at the counter.</p>
        </div>
        <a className="shrink-0 rounded-full bg-[#ecc233] px-5 py-2.5 text-sm font-extrabold text-[#0a1628] no-underline" href={REVIEW_URL}>Review us on Google</a>
      </section>
    </div>
  );
}

function Slide({
  kicker, title, text, href, cta, drawing, external = false,
}: {
  kicker: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  drawing: string;
  external?: boolean;
}) {
  const className = "mt-4 inline-flex rounded-full bg-[#ecc233] px-5 py-2.5 text-sm font-extrabold text-[#0a1628] no-underline";
  return (
    <article className="grid min-w-full snap-start grid-cols-[1.2fr_0.8fr] items-center gap-6 px-12 py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ecc233]">{kicker}</p>
        <h2 className="mt-2 text-4xl font-extrabold leading-tight text-white">{title}</h2>
        <p className="mt-2 max-w-md text-base leading-relaxed text-white/80">{text}</p>
        {external ? (
          <a className={className} href={href}>{cta}</a>
        ) : (
          <Link className={className} href={href}>{cta}</Link>
        )}
      </div>
      <span className="grid h-64 place-items-center rounded-[16px] bg-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={drawing} alt="" width={220} height={220} className="h-52 w-52 object-contain" />
      </span>
    </article>
  );
}
