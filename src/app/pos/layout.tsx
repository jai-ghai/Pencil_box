import type { Metadata } from "next";
import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";

export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AntdRoot>{children}</AntdRoot>
    </Suspense>
  );
}
