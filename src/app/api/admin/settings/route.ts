import { z } from "zod";
import { route, can } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { getQrTarget, getSetting, setSetting, validOrigin, validQrTarget } from "@/lib/settings";

/** QR settings: where /q sends people, and the website address the QR links are built from. */
export const GET = route(can("qr"), async () => ({
  qrTarget: await getQrTarget(),
  siteOrigin: validOrigin(await getSetting<string>("siteOrigin", "")) ?? "",
}));

const body = z.object({ qrTarget: z.string().optional(), siteOrigin: z.string().optional() });

export const PUT = route(can("qr"), async (req, actor) => {
  const b = body.parse(await req.json());
  const changes: string[] = [];
  if (b.qrTarget !== undefined) {
    const t = validQrTarget(b.qrTarget);
    if (!t) throw new AppError('Use a page on this site such as "/" or a full https:// link');
    await setSetting("qrTarget", t);
    changes.push(`QR opens ${t}`);
  }
  if (b.siteOrigin !== undefined) {
    const o = b.siteOrigin.trim() === "" ? "" : validOrigin(b.siteOrigin);
    if (o === null) throw new AppError("Use the website address, like https://pencilbox.store");
    await setSetting("siteOrigin", o);
    changes.push(`website address ${o || "cleared"}`);
  }
  if (changes.length) await audit(actor.username, "settings.qr", "setting", changes.join("; "));
  return { qrTarget: await getQrTarget(), siteOrigin: validOrigin(await getSetting<string>("siteOrigin", "")) ?? "" };
});
