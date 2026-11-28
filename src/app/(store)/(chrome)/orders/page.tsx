import { pageMeta, PHONE_TEL } from "@/lib/shop";
import { OpenCartButton } from "@/components/open-cart-button";

export const metadata = {
  ...pageMeta({
    title: "My orders | Pencil Box Stationery",
    description: "Send your Pencil Box order on WhatsApp. Pickup from B-92, Tigri Extension.",
    path: "/orders",
  }),
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  const whatsapp = `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}`;
  return (
    <div className="py-3">
      <h1 className="text-lg font-extrabold">My orders</h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5a6a82]">
        Your order is the cart. Add items, then send it on WhatsApp. The shop confirms the bill when you pick up.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <OpenCartButton />
        <a className="inline-flex items-center rounded-[10px] bg-[#153a7a] px-4 py-2 text-sm font-bold text-white no-underline" href={whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp the shop
        </a>
      </div>
    </div>
  );
}
