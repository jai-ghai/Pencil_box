"use client";

import { Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { inr } from "@/lib/client";
import { formatIST } from "@/lib/time";

export interface Bill {
  id: string;
  billNo: number;
  at: string;
  cashier?: string;
  total: number;
  discount: number;
  payments: { cash: number; upi: number };
  items: { name: string; qty: number; freeUnits: number; unitPrice: number; lineTotal: number; offer: string }[];
}

const mode = (b: Bill) => (b.payments.upi > 0 && b.payments.cash === 0 ? "UPI" : b.payments.cash > 0 && b.payments.upi === 0 ? "Cash" : "Cash + UPI");

/** Every bill made on the billing screen is an order record; this lists them with their items. */
export function BillsTable({ bills, loading }: { bills: Bill[]; loading?: boolean }) {
  const columns: TableColumnsType<Bill> = [
    { title: "Bill", dataIndex: "billNo", width: 64, render: (n: number) => <Typography.Text strong>#{n}</Typography.Text> },
    { title: "Time", dataIndex: "at", render: (d: string) => formatIST(d) },
    { title: "Items", key: "items", width: 64, align: "right", render: (_: unknown, b) => b.items.reduce((s, i) => s + i.qty, 0) },
    { title: "Paid by", key: "mode", width: 92, render: (_: unknown, b) => <Tag color={mode(b) === "UPI" ? "processing" : "default"}>{mode(b)}</Tag> },
    { title: "Total", dataIndex: "total", align: "right", width: 84, render: (n: number) => <Typography.Text strong>{inr(n)}</Typography.Text> },
  ];
  return (
    <Table<Bill>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={bills}
      pagination={bills.length > 25 ? { pageSize: 25, showSizeChanger: false } : false}
      locale={{ emptyText: "No bills yet" }}
      expandable={{
        expandedRowRender: (b) => (
          <ul className="m-0 list-none p-0">
            {b.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3 py-1">
                <span>
                  {i.name} × {i.qty}
                  {i.freeUnits > 0 && <Tag color="success" style={{ marginInlineStart: 8 }}>{i.freeUnits} free</Tag>}
                  {i.offer && <Typography.Text type="secondary" style={{ marginInlineStart: 8, fontSize: 12 }}>{i.offer}</Typography.Text>}
                </span>
                <span>{inr(i.lineTotal)}</span>
              </li>
            ))}
            {b.discount > 0 && <li className="flex justify-between gap-3 pt-1"><Typography.Text type="success">Offers</Typography.Text><Typography.Text type="success">−{inr(b.discount)}</Typography.Text></li>}
          </ul>
        ),
      }}
    />
  );
}
