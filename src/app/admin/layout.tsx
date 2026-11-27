import type { Metadata } from "next";
import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AntdRoot>
        <AdminShell>{children}</AdminShell>
      </AntdRoot>
    </Suspense>
  );
}
