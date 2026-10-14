"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";
import { api, inr } from "@/lib/client";
import { formatIST } from "@/lib/time";

interface Line { name: string; qty: number; unitCost: number; lineTotal: number }
interface PurchaseDoc { _id: string; supplierId?: { name: string } | null; invoiceNo?: string; note?: string; items: Line[]; total: number; date: string }

export default function Purchases() {
  const [list, setList] = useState<PurchaseDoc[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<{ purchases: PurchaseDoc[] }>("/api/admin/purchases").then((d) => setList(d.purchases)).catch((e: Error) => setErr(e.message));
  }, []);

  const columns: TableColumnsType<PurchaseDoc> = [
    { title: "Supplier", key: "s", render: (_: unknown, p) => <Typography.Text strong>{p.supplierId?.name ?? "Unknown supplier"}{p.invoiceNo ? ` · #${p.invoiceNo}` : ""}</Typography.Text> },
    { title: "Date", dataIndex: "date", width: 130, render: (d: string) => formatIST(d) },
    { title: "Items", key: "i", width: 80, align: "right", render: (_: unknown, p) => p.items.length },
    { title: "Pieces", key: "q", width: 90, align: "right", render: (_: unknown, p) => p.items.reduce((s, i) => s + i.qty, 0) },
    { title: "Total", dataIndex: "total", width: 120, align: "right", render: (n: number) => <Typography.Text strong>{inr(n)}</Typography.Text> },
  ];
  const lineColumns: TableColumnsType<Line> = [
    { title: "Item", dataIndex: "name" },
    { title: "Qty", dataIndex: "qty", align: "right", width: 80 },
    { title: "Cost each", dataIndex: "unitCost", align: "right", width: 110, render: (n: number) => inr(n) },
    { title: "Total", dataIndex: "lineTotal", align: "right", width: 110, render: (n: number) => inr(n) },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Purchases</Typography.Title>
      <Typography.Text type="secondary">Stock bought from suppliers. To record a new purchase for now, use <Link href="/admin/stock">Stock → Bought stock</Link> on each item.</Typography.Text>
      {err && <Alert type="error" showIcon title={err} />}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<PurchaseDoc>
          rowKey="_id"
          loading={!list && !err}
          columns={columns}
          dataSource={list ?? []}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: "No purchases yet" }}
          expandable={{
            expandedRowRender: (p) => (
              <div>
                {p.note && <Typography.Paragraph type="secondary">{p.note}</Typography.Paragraph>}
                <Table<Line> rowKey={(_, i) => String(i)} size="small" columns={lineColumns} dataSource={p.items} pagination={false} scroll={{ y: 360 }} />
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
}
