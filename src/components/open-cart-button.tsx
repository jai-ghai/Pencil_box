"use client";

export function OpenCartButton() {
  return (
    <button
      type="button"
      className="rounded-[10px] border border-[#153a7a] bg-white px-4 py-2 text-sm font-bold text-[#153a7a]"
      onClick={() => window.dispatchEvent(new Event("pb-open-cart"))}
    >
      Open cart
    </button>
  );
}
