"use client";

import type { ReactNode } from "react";
import { Button, Flex, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { printReceipt } from "@/lib/receipt";
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
  note?: string;
  source?: "pos" | "whatsapp";
  waText?: string;
  editedBy?: string;
  editedAt?: string | null;
  items: { variantId?: string; name: string; qty: number; freeUnits: number; unitPrice: number; lineTotal: number; offer: string }[];
}

const mode = (b: Bill) => (b.payments.upi > 0 && b.payments.cash === 0 ? "UPI" : b.payments.cash > 0 && b.payments.upi === 0 ? "Cash" : "Cash + UPI");

/** Every bill made on the billing screen is an order record; this lists them with their items. `actions` adds buttons (edit, delete) for people allowed to use them. */
export function BillsTable({ bills, loading, actions }: { bills: Bill[]; loading?: boolean; actions?: (b: Bill) => ReactNode }) {
  const columns: TableColumnsType<Bill> = [
    { title: "Bill", dataIndex: "billNo", width: 64, render: (n: number, b) => <Typography.Text strong>#{n}{b.source === "whatsapp" && <Tag color="success" style={{ marginInlineStart: 6 }}>WhatsApp</Tag>}</Typography.Text> },
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
          <div>
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
            {b.note && <Typography.Paragraph style={{ margin: "8px 0 0" }}><Typography.Text type="secondary">Note: </Typography.Text>{b.note}</Typography.Paragraph>}
            {b.cashier && <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 6 }}>Billed by {b.cashier}{b.editedBy ? ` · edited by ${b.editedBy}${b.editedAt ? ` on ${formatIST(b.editedAt)}` : ""}` : ""}</Typography.Text>}
            {b.waText && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 13 }}>The WhatsApp order this came from</summary>
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: "6px 0 0", fontFamily: "inherit" }}>{b.waText}</pre>
              </details>
            )}
            <Flex gap={8} wrap style={{ marginTop: 10 }}>
              <Button icon={<PrinterOutlined />} onClick={() => printReceipt(b)}>Print receipt</Button>
              {actions?.(b)}
            </Flex>
          </div>
        ),
      }}
    />
  );
}
