/**
 * Questions stay collapsed until opened. The answer text is still in the HTML
 * (inside details), so search engines and the FAQ schema can read it.
 * summary is the button; the browser sets aria-expanded.
 */
export function FaqAccordion({
  items,
  title = "Common questions",
  id = "shop-faq",
  heading = "h2",
  bare = false,
}: {
  items: { q: string; a: string }[];
  title?: string;
  id?: string;
  heading?: "h2" | "h3";
  /** Category pages already sit in a padded column. */
  bare?: boolean;
}) {
  const Heading = heading;
  const list = (
    <div className="pb-faq mt-3">
      {items.map((item) => (
        <details key={item.q}>
          <summary>
            <span>{item.q}</span>
            <span className="pb-faq-icon" aria-hidden="true">+</span>
          </summary>
          <p className="pb-faq-body">{item.a}</p>
        </details>
      ))}
    </div>
  );
  if (bare) {
    return (
      <div className="mt-4">
        <Heading id={id} className="font-extrabold">{title}</Heading>
        {list}
      </div>
    );
  }
  return (
    <section aria-labelledby={id} className="mx-auto w-full max-w-6xl px-4 pt-8">
      <Heading id={id} className="text-lg font-extrabold">{title}</Heading>
      {list}
    </section>
  );
}
