import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-[15px] leading-relaxed">That address is not on Pencil Box. The shop is still at B-92, Tigri Extension.</p>
      <Link href="/" className="mt-4 inline-block font-bold text-[#153a7a]">Back to the shop</Link>
    </main>
  );
}
