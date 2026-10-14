/** Build the lower-cased string used for fast POS "type to find" search. */
export function buildSearchText(parts: (string | undefined | null | string[])[]): string {
  return parts
    .flat()
    .filter((p): p is string => !!p)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every typed word must appear somewhere in the search text (any order): "nat hb" finds "Nataraj HB pencil". */
export function wordsRegexFilter(query: string): { $and: { searchText: RegExp }[] } | null {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length) return null;
  return { $and: words.map((w) => ({ searchText: new RegExp(escapeRegex(w)) })) };
}
