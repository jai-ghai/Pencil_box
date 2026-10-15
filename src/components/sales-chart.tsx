"use client";

import { Flex, theme, Typography } from "antd";

interface Point {
  label: string;
  revenue: number;
  profit: number;
}

const rs = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Sales and profit per period as paired bars. The table under it has the same numbers, so it is not the only source. */
export function SalesChart({ series }: { series: Point[] }) {
  const { token } = theme.useToken();
  const max = Math.max(1, ...series.flatMap((p) => [p.revenue, p.profit]));
  const sales = token.colorPrimary;
  const profit = token.colorSuccess;
  return (
    <div>
      <Flex gap={16} className="mb-2" align="center">
        <Typography.Text style={{ fontSize: 13 }}><span style={{ display: "inline-block", width: 10, height: 10, background: sales, borderRadius: 2, marginInlineEnd: 6 }} />Sales</Typography.Text>
        <Typography.Text style={{ fontSize: 13 }}><span style={{ display: "inline-block", width: 10, height: 10, background: profit, borderRadius: 2, marginInlineEnd: 6 }} />Profit</Typography.Text>
      </Flex>
      <div className="pb-scroll-x" role="img" aria-label="Sales and profit for each period. The table below shows the same numbers.">
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minWidth: series.length * 46 }}>
          {series.map((p) => (
            <div key={p.label} style={{ flex: "1 0 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} title={`${p.label}: sales ${rs(p.revenue)}, profit ${rs(p.profit)}`}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 180, width: "100%", justifyContent: "center", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <div style={{ width: "40%", maxWidth: 18, height: `${(p.revenue / max) * 100}%`, minHeight: p.revenue > 0 ? 2 : 0, background: sales, borderRadius: "3px 3px 0 0" }} />
                <div style={{ width: "40%", maxWidth: 18, height: `${(Math.max(0, p.profit) / max) * 100}%`, minHeight: p.profit > 0 ? 2 : 0, background: profit, borderRadius: "3px 3px 0 0" }} />
              </div>
              <div style={{ fontSize: 11, color: token.colorTextSecondary, textAlign: "center", lineHeight: 1.2 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
