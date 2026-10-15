"use client";

import { useRef, useState } from "react";
import { Alert, App, Button, Empty, Flex, Input, InputNumber, Modal, Segmented, Select, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { Bill } from "@/components/bills-table";
import { api, itemTitle } from "@/lib/client";

interface Line {
  variantId: string;
  name: string;
  qty: number;
}
interface Found {
  variantId: string;
  name: string;
  brand: string;
  label: string;
  shortCode: string;
}

/**
 * Edit a bill: change quantities, remove lines, add items, switch cash/UPI, add a note.
 * Existing lines keep the price they were sold at; new lines use today's price; offers are applied as they are today.
 * The server corrects stock by the difference.
 */
export function EditBillModal({ bill, onClose, onSaved }: { bill: Bill | null; onClose: () => void; onSaved: () => void }) {
  const { message } = App.useApp();
  const [lines, setLines] = useState<Line[]>(() => bill?.items.map((i) => ({ variantId: i.variantId ?? "", name: i.name, qty: i.qty })) ?? []);
  const [payMode, setPayMode] = useState<"cash" | "upi">(bill && bill.payments.upi > 0 && bill.payments.cash === 0 ? "upi" : "cash");
  const [note, setNote] = useState(bill?.note ?? "");
  const [found, setFound] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) return setFound([]);
    timer.current = setTimeout(() => api<{ items: Found[] }>(`/api/pos/search?q=${encodeURIComponent(q)}`).then((d) => setFound(d.items)).catch(() => {}), 200);
  }
  function addItem(id: string) {
    const f = found.find((x) => x.variantId === id);
    if (!f) return;
    setLines((ls) => (ls.some((l) => l.variantId === id) ? ls.map((l) => (l.variantId === id ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { variantId: id, name: itemTitle(f), qty: 1 }]));
  }

  async function save() {
    if (!bill) return;
    setBusy(true);
    try {
      const out = await api<{ total: number }>(`/api/admin/bills/${bill.id}`, { method: "PATCH", body: { items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), payMode, note: note.trim() || undefined } });
      message.success(`Bill #${bill.billNo} saved. New total ₹${out.total / 100}.`);
      onSaved();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumnsType<Line> = [
    { title: "Item", dataIndex: "name" },
    { title: "Qty", key: "q", width: 100, render: (_: unknown, l) => <InputNumber min={1} max={100000} value={l.qty} onChange={(v) => setLines((ls) => ls.map((x) => (x.variantId === l.variantId ? { ...x, qty: v ?? 1 } : x)))} style={{ width: 84 }} aria-label={`Quantity of ${l.name}`} /> },
    { title: "", key: "x", width: 48, render: (_: unknown, l) => <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Remove ${l.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.variantId !== l.variantId))} /> },
  ];

  return (
    <Modal open={!!bill} title={bill ? `Edit bill #${bill.billNo}` : ""} onCancel={onClose} onOk={save} okText="Save changes" okButtonProps={{ loading: busy, disabled: lines.length === 0 }} width={620} destroyOnHidden>
      <Flex vertical gap={12}>
        <Alert type="info" showIcon title="Items already on the bill keep the price they were sold at. New items use today's price. Stock is corrected automatically." />
        <Table<Line> rowKey="variantId" size="small" pagination={false} columns={columns} dataSource={lines} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Add at least one item" /> }} />
        <Select
          showSearch={{ filterOption: false, onSearch: search }}
          value={null as unknown as string}
          placeholder="Add another item: type its name or code"
          onChange={addItem}
          options={found.map((f) => ({ value: f.variantId, label: `${itemTitle(f)}${f.shortCode ? `  [${f.shortCode.toUpperCase()}]` : ""}` }))}
          aria-label="Add an item"
        />
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 4 }}>Paid by</Typography.Text>
          <Segmented<"cash" | "upi"> value={payMode} onChange={setPayMode} options={[{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }]} />
        </div>
        <div>
          <label htmlFor="billNote" style={{ fontSize: 13 }}>Note (optional)</label>
          <Input id="billNote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
      </Flex>
    </Modal>
  );
}
