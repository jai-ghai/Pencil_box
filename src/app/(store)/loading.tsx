/** Shown while a shop route is loading, so the page is not a blank gap. */
export default function StoreLoading() {
  return (
    <div className="px-4 py-4" aria-busy="true" aria-label="Loading">
      <div className="mb-3 h-5 w-40 rounded bg-[#e6e9ee]" />
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-[10px] border border-black/5 bg-white">
            <span className="pb-shimmer block aspect-square" />
            <span className="mx-2 mb-2 mt-2 block h-3 rounded bg-[#e6e9ee]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
