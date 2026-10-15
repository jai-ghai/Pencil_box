import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { QrGenerator } from "./qr-generator";

export const metadata: Metadata = { title: "QR generator · Pencil Box" };

export default function QrGeneratorPage() {
  return (
    <AdminShell>
      <QrGenerator />
    </AdminShell>
  );
}
