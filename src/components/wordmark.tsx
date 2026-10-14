import { BRAND } from "@/lib/theme";

/** Text wordmark from the shop poster: PENCIL in white, BOX in yellow. Always sits on the navy header. */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="font-black leading-none tracking-wide whitespace-nowrap" style={{ fontSize: size, color: "#fff" }} aria-label="Pencil Box">
      PENCIL <span style={{ color: BRAND.sun }}>BOX</span>
    </span>
  );
}
