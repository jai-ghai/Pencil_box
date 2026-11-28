import { pageMeta } from "@/lib/shop";

export const metadata = pageMeta({
  title: "All products | Pencil Box Stationery",
  description: "Browse stationery, art supplies, gifts and photocopy at Pencil Box Stationery, Tigri Extension.",
  path: "/products",
});

export default function ProductsPage() {
  return (
    <div className="order-1 pt-3">
      <h1 className="text-lg font-extrabold">All products</h1>
    </div>
  );
}
