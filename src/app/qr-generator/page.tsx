import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin-shell";
import { AntdRoot } from "@/components/antd-root";
import { QrGenerator } from "./qr-generator";

export const metadata: Metadata = { title: "QR generator" };

export default function QrGeneratorPage() {
  return (
    <Suspense fallback={null}>
      <AntdRoot>
        <AdminShell>
          <QrGenerator />
        </AdminShell>
      </AntdRoot>
    </Suspense>
  );
}
