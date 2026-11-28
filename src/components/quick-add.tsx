"use client";

const CART_KEY = "pb_cart_v1";

/** Adds one unit from a server-rendered card and tells the header cart to refresh. */
export function QuickAdd({ id, label }: { id: string; label: string }) {
  return (
    <button
      type="button"
      className="mt-1 w-full rounded-[10px] bg-[#ecc233] py-2 text-sm font-extrabold text-[#0a1628]"
      aria-label={`Add: ${label}`}
      onClick={() => {
        try {
          const cart = JSON.parse(localStorage.getItem(CART_KEY) || "{}") as Record<string, number>;
          const next = Number(cart[id]) || 0;
          cart[id] = Math.min(99, next + 1);
          localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch {
          /* private mode: the tap still should not throw */
        }
        window.dispatchEvent(new Event("pb-cart"));
      }}
    >
      Add
    </button>
  );
}
