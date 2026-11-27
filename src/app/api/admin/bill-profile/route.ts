import { z } from "zod";
import { can, route, STAFF } from "@/lib/api";
import { getSetting, setSetting } from "@/lib/settings";

/** UPI ID printed as a payment QR. Empty means the bill has no payment QR. */
const UPI_KEY = "bill.upiId";

/**
 * Reserved for a GSTIN. The shop is not registered, so nothing reads or writes this,
 * and the bill never prints it.
 */
export const UNUSED_GSTIN_SETTING = "bill.gstin";

const upiId = z
  .string()
  .trim()
  .max(80)
  .refine((v) => v === "" || /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,40}$/.test(v), "Enter a UPI ID like name@bank, or leave it empty");

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const GET = route(STAFF, async () => {
  void UNUSED_GSTIN_SETTING;
  return { upiId: clean(await getSetting(UPI_KEY, "")) };
});

export const PUT = route(can("setup"), async (req) => {
  const body = z.object({ upiId }).parse(await req.json());
  await setSetting(UPI_KEY, body.upiId);
  return { upiId: body.upiId };
});
