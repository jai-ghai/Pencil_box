/** Grey shimmer blocks that hold the shop layout while the catalogue shell arrives. */
export function StoreSkeleton({ rows = 9 }: { rows?: number }) {
  return (
    <div className="px-4 py-4" aria-busy="true" aria-label="Loading">
      <div className="mb-3 h-5 w-40 rounded bg-[#e6e9ee]" />
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-[10px] border border-black/5 bg-white">
            <span className="pb-shimmer block aspect-square" />
            <span className="mx-2 mb-2 mt-2 block h-3 rounded bg-[#e6e9ee]" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * First paint of the shop, before Ant Design's shell is ready.
 * The bar matches the navy header, and the min height keeps the FAQ below the fold
 * so it does not jump down when the real page replaces this.
 */
export function CatalogueShellSkeleton() {
  return (
    <div className="min-h-dvh bg-[#f0f3f8]">
      <div className="h-28" style={{ background: "#153a7a" }} aria-hidden />
      <StoreSkeleton rows={12} />
    </div>
  );
}
