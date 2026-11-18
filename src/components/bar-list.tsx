"use client";

import { theme, Typography } from "antd";

/** Ranked horizontal bars with the value written out beside each one, so the numbers never depend on the bar alone. */
export function BarList({ rows, format, empty = "Nothing yet" }: { rows: { label: string; value: number; note?: string }[]; format: (n: number) => string; empty?: string }) {
  const { token } = theme.useToken();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Typography.Text type="secondary">{empty}</Typography.Text>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span style={{ overflowWrap: "anywhere" }}>{r.label}{r.note && <span style={{ color: token.colorTextSecondary }}> · {r.note}</span>}</span>
            <strong className="shrink-0">{format(r.value)}</strong>
          </div>
          <div aria-hidden style={{ height: 8, borderRadius: 4, background: token.colorFillSecondary }}>
            <div style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 3 : 0, height: "100%", borderRadius: 4, background: token.colorPrimary }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
