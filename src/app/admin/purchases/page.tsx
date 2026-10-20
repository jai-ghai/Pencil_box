"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { Alert, App, Button, Card, DatePicker, Drawer, Flex, Grid, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag, Typography } from "antd";
import { DeleteOutlined, DownloadOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import Link from "next/link";
import { api, inr } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";
import { formatIST } from "@/lib/time";

/** money in paise; sellPrice is what the item sells for now */
interface Line { variantId: string; name: string; code: string; qty: number; unitCost: number; lineTotal: number; sellPrice: number | null }
interface PurchaseDoc { _id: string; supplierId?: { name: string } | null; invoiceNo?: string; note?: string; items: Line[]; total: number; date: string }
interface EditLine { qty: number; cost: number; price: number | undefined }
interface Found { variantId: string; title: string; code: string; costPrice: number; sellPrice: number; stockOnHand: number }
interface NewLine { variantId: string; title: string; code: string; qty: number; cost: number; price: number | undefined }
interface SupplierOpt { _id: string; name: string }

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
  const [lineSearch, setLineSearch] = useState("");
  const screens = Grid.useBreakpoint();

  /* new purchase */
  const [adding, setAdding] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [supplierName, setSupplierName] = useState("");
  const [newBill, setNewBill] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newDate, setNewDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [newLines, setNewLines] = useState<NewLine[]>([]);
  const [found, setFound] = useState<Found[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<{ purchases: PurchaseDoc[] }>("/api/admin/purchases").then((d) => setList(d.purchases)).catch((e: Error) => setErr(e.message));
  }, []);
  const reload = async () => setList((await api<{ purchases: PurchaseDoc[] }>("/api/admin/purchases")).purchases);

  function startNew() {
    setSupplierId(undefined);
    setSupplierName("");
    setNewBill("");
    setNewNote("");
    setNewDate(dayjs());
    setNewLines([]);
    setFound([]);
    setAdding(true);
    api<{ suppliers: SupplierOpt[] }>("/api/admin/suppliers").then((d) => setSuppliers(d.suppliers)).catch(() => {});
  }
  function searchItems(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) return setFound([]);
    timer.current = setTimeout(() => api<{ items: Found[] }>(`/api/admin/purchases/items?q=${encodeURIComponent(q)}`).then((d) => setFound(d.items)).catch(() => {}), 200);
  }
  function addItem(id: string) {
    const f = found.find((x) => x.variantId === id);
    if (!f) return;
    if (newLines.some((l) => l.variantId === id)) return message.info("That item is already in the list. Change its quantity instead.");
    setNewLines((ls) => [...ls, { variantId: id, title: f.title, code: f.code, qty: 1, cost: f.costPrice / 100, price: f.sellPrice / 100 }]);
    setFound([]);
  }
  const patchNew = (i: number, change: Partial<NewLine>) => setNewLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...change } : l)));
  async function saveNew() {
    setSaving(true);
    try {
      await api("/api/admin/purchases", {
        body: {
          supplierId: supplierId || undefined,
          supplierName: supplierId ? undefined : supplierName.trim() || undefined,
          invoiceNo: newBill.trim() || undefined,
          note: newNote.trim() || undefined,
          date: newDate ? new Date(`${newDate.format("YYYY-MM-DD")}T12:00:00+05:30`).toISOString() : undefined,
          lines: newLines.map((l) => ({ variantId: l.variantId, qty: l.qty, cost: l.cost ?? 0, price: l.price })),
        },
      });
      message.success("Purchase saved. Stock is updated.");
      setAdding(false);
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: PurchaseDoc) {
    setEditing(p);
    setLineSearch("");
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

  /* rows of the edit window; `idx` is the line's place in the purchase, so search results still edit the right line */
  const editRows = (editing?.items ?? []).map((l, idx) => ({ ...l, idx })).filter((l) => {
    const words = lineSearch.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = `${l.code} ${l.name}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const editTotal = lines.reduce((s, l) => s + Math.round((l.qty ?? 0) * (l.cost ?? 0) * 100), 0);
  const editColumns: TableColumnsType<Line & { idx: number }> = [
    { title: "Item", key: "n", render: (_: unknown, l) => <span>{l.code && <Typography.Text code>{l.code}</Typography.Text>} {l.name}</span> },
    { title: "Qty", key: "q", width: 100, render: (_: unknown, l) => <InputNumber min={0} precision={0} value={lines[l.idx]?.qty} onChange={(v) => patch(l.idx, { qty: v ?? 0 })} style={{ width: 84 }} aria-label="Quantity" /> },
    { title: "CP ₹ each", key: "c", width: 120, render: (_: unknown, l) => <InputNumber min={0} precision={2} value={lines[l.idx]?.cost} onChange={(v) => patch(l.idx, { cost: v ?? 0 })} style={{ width: 104 }} aria-label="Cost price each" /> },
    { title: "SP ₹ each", key: "p", width: 120, render: (_: unknown, l) => <InputNumber min={0} precision={2} value={lines[l.idx]?.price} onChange={(v) => patch(l.idx, { price: v ?? undefined })} style={{ width: 104 }} aria-label="Selling price each" /> },
    { title: "Total", key: "t", align: "right", width: 100, render: (_: unknown, l) => inr(Math.round((lines[l.idx]?.qty ?? 0) * (lines[l.idx]?.cost ?? 0) * 100)) },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>Purchases</Typography.Title>
        <Flex gap={8} wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={startNew}>New purchase</Button>
          <Button icon={<DownloadOutlined />} href="/api/admin/purchases/export">Download all as Excel</Button>
        </Flex>
      </Flex>
      <Typography.Text type="secondary">Stock bought from suppliers. Open a purchase to see each item with its cost (CP), selling price (SP) and quantity. Tap <b>New purchase</b> to enter a bill. An item you have never stocked must be added first on the <Link href="/admin/products">Products</Link> page.</Typography.Text>
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

      <Drawer
        open={adding}
        onClose={() => setAdding(false)}
        title="New purchase"
        size={screens.md ? 860 : "100%"}
        extra={<Flex gap={8}><Button onClick={() => setAdding(false)}>Cancel</Button><Button type="primary" loading={saving} disabled={!newLines.length || (!supplierId && !supplierName.trim())} onClick={saveNew}>Save purchase</Button></Flex>}
      >
        <Flex vertical gap={12}>
          <Flex gap={12} wrap>
            <Select allowClear showSearch={{ optionFilterProp: "label" }} placeholder="Choose supplier" value={supplierId} onChange={setSupplierId} style={{ width: 240 }} options={suppliers.map((s) => ({ value: s._id, label: s.name }))} />
            <Input placeholder="or type a new supplier name" value={supplierName} disabled={!!supplierId} maxLength={80} onChange={(e) => setSupplierName(e.target.value)} style={{ width: 240 }} />
            <DatePicker value={newDate} onChange={setNewDate} allowClear={false} format="DD MMM YYYY" disabledDate={(d) => d.isAfter(dayjs(), "day")} />
          </Flex>
          <Flex gap={12} wrap>
            <Input placeholder="Bill / invoice number (optional)" value={newBill} maxLength={40} onChange={(e) => setNewBill(e.target.value)} style={{ width: 240 }} />
            <Input placeholder="Note (optional)" value={newNote} maxLength={500} onChange={(e) => setNewNote(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          </Flex>
          <Select
            showSearch={{ filterOption: false, onSearch: searchItems }}
            value={null}
            placeholder="Type an item name or code to add it"
            onSelect={(id) => id && addItem(String(id))}
            notFoundContent="Type to search. New items must be added on the Products page first."
            options={found.map((f) => ({ value: f.variantId, label: `${f.code ? `[${f.code}] ` : ""}${f.title}  ·  CP ${inr(f.costPrice)}  SP ${inr(f.sellPrice)}  ·  stock ${f.stockOnHand}` }))}
          />
          <Table<NewLine>
            rowKey="variantId"
            size="small"
            pagination={false}
            scroll={{ y: 420, x: "max-content" }}
            dataSource={newLines}
            locale={{ emptyText: "No items yet. Search above to add the items on your bill." }}
            columns={[
              { title: "Item", key: "n", render: (_: unknown, l) => <span>{l.code && <Typography.Text code>{l.code}</Typography.Text>} {l.title}</span> },
              { title: "Qty", key: "q", width: 100, render: (_: unknown, l, i) => <InputNumber min={1} precision={0} value={l.qty} onChange={(v) => patchNew(i, { qty: v ?? 1 })} style={{ width: 84 }} aria-label="Quantity" /> },
              { title: "CP ₹ each", key: "c", width: 120, render: (_: unknown, l, i) => <InputNumber min={0} precision={2} value={l.cost} onChange={(v) => patchNew(i, { cost: v ?? 0 })} style={{ width: 104 }} aria-label="Cost price each" /> },
              { title: "SP ₹ each", key: "p", width: 120, render: (_: unknown, l, i) => <InputNumber min={0} precision={2} value={l.price} onChange={(v) => patchNew(i, { price: v ?? undefined })} style={{ width: 104 }} aria-label="Selling price each" /> },
              { title: "Total", key: "t", align: "right", width: 100, render: (_: unknown, l) => inr(Math.round((l.qty ?? 0) * (l.cost ?? 0) * 100)) },
              { title: "", key: "x", width: 50, render: (_: unknown, l) => <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Remove ${l.title}`} onClick={() => setNewLines((ls) => ls.filter((x) => x.variantId !== l.variantId))} /> },
            ]}
          />
          <Flex justify="space-between" align="center" wrap gap={8}>
            <Typography.Text type="secondary">Saving adds the stock and sets each item&apos;s cost and selling price to what you entered.</Typography.Text>
            <Typography.Text strong>Purchase total: {inr(newLines.reduce((s, l) => s + Math.round((l.qty ?? 0) * (l.cost ?? 0) * 100), 0))}</Typography.Text>
          </Flex>
        </Flex>
      </Drawer>

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
          <Input.Search allowClear placeholder={`Search the ${editing?.items.length ?? 0} items in this purchase by name or code`} value={lineSearch} onChange={(e) => setLineSearch(e.target.value)} />
          <Table<Line & { idx: number }> rowKey="variantId" size="small" columns={editColumns} dataSource={editRows} pagination={false} scroll={{ y: 380 }} locale={{ emptyText: "No item in this purchase matches." }} />
          <Flex justify="flex-end"><Typography.Text strong>New purchase total: {inr(editTotal)}</Typography.Text></Flex>
        </Flex>
      </Modal>
    </div>
  );
}
