"use client";

import { useEffect, useState } from "react";
import { Alert, App, Button, Card, Flex, Input, InputNumber, Modal, Popconfirm, Table, Tag, Typography } from "antd";
import { DeleteOutlined, DownloadOutlined, EditOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import Link from "next/link";
import { api, inr } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";
import { formatIST } from "@/lib/time";

/** money in paise; sellPrice is what the item sells for now */
interface Line { variantId: string; name: string; code: string; qty: number; unitCost: number; lineTotal: number; sellPrice: number | null }
interface PurchaseDoc { _id: string; supplierId?: { name: string } | null; invoiceNo?: string; note?: string; items: Line[]; total: number; date: string }
interface EditLine { qty: number; cost: number; price: number | undefined }

const margin = (cost: number, price: number | null) => (price && price > 0 ? Math.round(((price - cost) / price) * 100) : null);

export default function Purchases() {
  const { message } = App.useApp();
  const me = useMe();
  const canEdit = can(me, "purchases:edit");
  const [list, setList] = useState<PurchaseDoc[] | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<PurchaseDoc | null>(null);
  const [lines, setLines] = useState<EditLine[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ purchases: PurchaseDoc[] }>("/api/admin/purchases").then((d) => setList(d.purchases)).catch((e: Error) => setErr(e.message));
  }, []);
  const reload = async () => setList((await api<{ purchases: PurchaseDoc[] }>("/api/admin/purchases")).purchases);

  function startEdit(p: PurchaseDoc) {
    setEditing(p);
    setLines(p.items.map((i) => ({ qty: i.qty, cost: i.unitCost / 100, price: i.sellPrice === null ? undefined : i.sellPrice / 100 })));
    setInvoiceNo(p.invoiceNo ?? "");
    setNote(p.note ?? "");
  }
  const patch = (i: number, change: Partial<EditLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...change } : l)));

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/api/admin/purchases/${editing._id}`, {
        method: "PUT",
        body: { invoiceNo: invoiceNo.trim() || undefined, note: note.trim() || undefined, lines: lines.map((l) => ({ qty: l.qty ?? 0, cost: l.cost ?? 0, price: l.price })) },
      });
      message.success("Purchase saved. Stock and prices are updated.");
      setEditing(null);
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function remove(p: PurchaseDoc) {
    try {
      await api(`/api/admin/purchases/${p._id}`, { method: "DELETE" });
      message.success("Purchase deleted. The stock it added was taken back out.");
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const columns: TableColumnsType<PurchaseDoc> = [
    { title: "Supplier", key: "s", render: (_: unknown, p) => <Typography.Text strong>{p.supplierId?.name ?? "Unknown supplier"}{p.invoiceNo ? ` · #${p.invoiceNo}` : ""}</Typography.Text> },
    { title: "Date", dataIndex: "date", width: 130, render: (d: string) => formatIST(d) },
    { title: "Items", key: "i", width: 80, align: "right", render: (_: unknown, p) => p.items.length },
    { title: "Pieces", key: "q", width: 90, align: "right", render: (_: unknown, p) => p.items.reduce((s, i) => s + i.qty, 0) },
    { title: "Total", dataIndex: "total", width: 120, align: "right", render: (n: number) => <Typography.Text strong>{inr(n)}</Typography.Text> },
  ];
  const lineColumns: TableColumnsType<Line> = [
    { title: "Item", key: "n", render: (_: unknown, l) => <span>{l.code && <Typography.Text code>{l.code}</Typography.Text>} {l.name}</span> },
    { title: "Qty", dataIndex: "qty", align: "right", width: 70 },
    { title: "CP (cost each)", dataIndex: "unitCost", align: "right", width: 120, render: (n: number) => inr(n) },
    { title: "SP (sells for)", dataIndex: "sellPrice", align: "right", width: 120, render: (n: number | null) => (n === null ? "-" : inr(n)) },
    {
      title: "Margin",
      key: "m",
      align: "right",
      width: 90,
      render: (_: unknown, l) => {
        const m = margin(l.unitCost, l.sellPrice);
        return m === null ? "-" : <Tag color={m >= 20 ? "green" : m >= 10 ? "orange" : "red"} style={{ margin: 0 }}>{m}%</Tag>;
      },
    },
    { title: "Line total", dataIndex: "lineTotal", align: "right", width: 120, render: (n: number) => inr(n) },
  ];

  const editTotal = lines.reduce((s, l) => s + Math.round((l.qty ?? 0) * (l.cost ?? 0) * 100), 0);
  const editColumns: TableColumnsType<Line> = [
    { title: "Item", key: "n", render: (_: unknown, l) => <span>{l.code && <Typography.Text code>{l.code}</Typography.Text>} {l.name}</span> },
    { title: "Qty", key: "q", width: 100, render: (_: unknown, __, i) => <InputNumber min={0} precision={0} value={lines[i]?.qty} onChange={(v) => patch(i, { qty: v ?? 0 })} style={{ width: 84 }} aria-label="Quantity" /> },
    { title: "CP ₹ each", key: "c", width: 120, render: (_: unknown, __, i) => <InputNumber min={0} precision={2} value={lines[i]?.cost} onChange={(v) => patch(i, { cost: v ?? 0 })} style={{ width: 104 }} aria-label="Cost price each" /> },
    { title: "SP ₹ each", key: "p", width: 120, render: (_: unknown, __, i) => <InputNumber min={0} precision={2} value={lines[i]?.price} onChange={(v) => patch(i, { price: v ?? undefined })} style={{ width: 104 }} aria-label="Selling price each" /> },
    { title: "Total", key: "t", align: "right", width: 100, render: (_: unknown, __, i) => inr(Math.round((lines[i]?.qty ?? 0) * (lines[i]?.cost ?? 0) * 100)) },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>Purchases</Typography.Title>
        <Button icon={<DownloadOutlined />} href="/api/admin/purchases/export">Download all as Excel</Button>
      </Flex>
      <Typography.Text type="secondary">Stock bought from suppliers. Open a purchase to see each item with its cost (CP), selling price (SP) and quantity. To record a new purchase for now, use <Link href="/admin/stock">Stock → Bought stock</Link> on each item.</Typography.Text>
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
                <Flex gap={8} wrap style={{ marginBottom: 12 }}>
                  <Button icon={<DownloadOutlined />} href={`/api/admin/purchases/export?id=${p._id}`}>Download this purchase as Excel</Button>
                  {canEdit && <Button type="primary" icon={<EditOutlined />} onClick={() => startEdit(p)}>Edit this purchase</Button>}
                  {canEdit && (
                    <Popconfirm title="Delete this whole purchase?" description="The stock it added is taken back out. Use this only if the whole purchase was entered by mistake." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(p)}>
                      <Button danger icon={<DeleteOutlined />}>Delete purchase</Button>
                    </Popconfirm>
                  )}
                </Flex>
                <Table<Line> rowKey="variantId" size="small" columns={lineColumns} dataSource={p.items} pagination={false} scroll={{ y: 360 }} />
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        title={`Edit purchase${editing?.supplierId?.name ? ` · ${editing.supplierId.name}` : ""}`}
        width={820}
        okText="Save changes"
        confirmLoading={saving}
        onOk={save}
        destroyOnHidden
      >
        <Flex vertical gap={12}>
          <Alert type="info" showIcon title="Changing the quantity changes the stock. Changing CP or SP updates the item's cost and selling price in the shop. Set a quantity of 0 to remove an item from this purchase." />
          <Flex gap={12} wrap>
            <Input placeholder="Bill / invoice number (optional)" value={invoiceNo} maxLength={40} onChange={(e) => setInvoiceNo(e.target.value)} style={{ maxWidth: 260 }} />
            <Input placeholder="Note (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          </Flex>
          <Table<Line> rowKey="variantId" size="small" columns={editColumns} dataSource={editing?.items ?? []} pagination={false} scroll={{ y: 420 }} />
          <Flex justify="flex-end"><Typography.Text strong>New purchase total: {inr(editTotal)}</Typography.Text></Flex>
        </Flex>
      </Modal>
    </div>
  );
}
