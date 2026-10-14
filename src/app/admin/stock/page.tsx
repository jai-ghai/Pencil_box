"use client";

import { useRef, useState } from "react";
import { App, Button, Card, Empty, Flex, Form, Input, InputNumber, Segmented, Select, Statistic, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { api, inr, itemTitle } from "@/lib/client";
import { formatIST } from "@/lib/time";

interface Item { variantId: string; name: string; brand: string; label: string; shortCode: string; stockOnHand: number; packSize: number; sellPrice: number }
interface Move { _id: string; type: string; qty: number; note?: string; by?: string; at: string }
type Mode = "PURCHASE" | "COUNT" | "DAMAGE" | "RETURN";

const MODES: { value: Mode; label: string }[] = [
  { value: "PURCHASE", label: "Bought stock" },
  { value: "COUNT", label: "Stock count" },
  { value: "DAMAGE", label: "Damaged or lost" },
  { value: "RETURN", label: "Customer return" },
];

export default function StockPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [options, setOptions] = useState<Item[]>([]);
  const [sel, setSel] = useState<Item | null>(null);
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [mode, setMode] = useState<Mode>("PURCHASE");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) return setOptions([]);
    timer.current = setTimeout(() => api<{ items: Item[] }>(`/api/pos/search?q=${encodeURIComponent(q)}`).then((d) => setOptions(d.items)).catch(() => {}), 200);
  }
  async function loadMoves(id: string) {
    setMoves((await api<{ movements: Move[] }>(`/api/admin/stock?variantId=${id}`)).movements);
  }
  function pick(id: string) {
    const item = options.find((o) => o.variantId === id);
    if (!item) return;
    setSel(item);
    form.resetFields();
    setMoves(null);
    loadMoves(id).catch((e: Error) => message.error(e.message));
  }

  async function submit(v: { packs?: number; pieces?: number; cost?: number; counted?: number; qty?: number; note?: string }) {
    if (!sel) return;
    setBusy(true);
    try {
      const note = v.note?.trim() || undefined;
      const body =
        mode === "PURCHASE" ? { mode, variantId: sel.variantId, packs: v.packs ?? 0, pieces: v.pieces ?? 0, costPerPiece: v.cost, note }
        : mode === "COUNT" ? { mode, variantId: sel.variantId, counted: v.counted ?? 0, note }
        : { mode, variantId: sel.variantId, qty: v.qty ?? 0, note };
      const out = await api<{ stockOnHand: number; unchanged?: boolean }>("/api/admin/stock", { body });
      setSel({ ...sel, stockOnHand: out.stockOnHand });
      if (out.unchanged) message.info("The count matches, nothing changed.");
      else message.success(`Saved. Stock is now ${out.stockOnHand}.`);
      form.resetFields();
      await loadMoves(sel.variantId);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumnsType<Move> = [
    { title: "When", dataIndex: "at", width: 130, render: (d: string) => formatIST(d) },
    { title: "Type", dataIndex: "type", width: 120, render: (t: string) => <Tag>{t}</Tag> },
    { title: "Change", dataIndex: "qty", align: "right", width: 90, render: (n: number) => <Typography.Text strong type={n < 0 ? "danger" : "success"}>{n > 0 ? "+" : ""}{n}</Typography.Text> },
    { title: "Note", key: "n", render: (_: unknown, m) => <Typography.Text type="secondary">{m.note} {m.by && `· ${m.by}`}</Typography.Text> },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Stock</Typography.Title>
      <Select
        showSearch={{ filterOption: false, onSearch: search }}
        size="large"
        placeholder="Find an item: type its name or code"
        value={sel?.variantId}
        onChange={pick}
        notFoundContent={<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Type to search" />}
        options={options.map((o) => ({ value: o.variantId, label: `${itemTitle(o)}${o.shortCode ? `  [${o.shortCode.toUpperCase()}]` : ""}  ·  stock ${o.stockOnHand}` }))}
        aria-label="Find an item"
      />

      {sel && (
        <Card>
          <Flex justify="space-between" align="flex-start" gap={12} wrap>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>{itemTitle(sel)}</Typography.Title>
              <Typography.Text type="secondary">{inr(sel.sellPrice)} each · {sel.packSize} per box{sel.shortCode ? ` · code ${sel.shortCode.toUpperCase()}` : ""}</Typography.Text>
            </div>
            <Statistic title="In stock" value={sel.stockOnHand} />
          </Flex>

          <Segmented<Mode> className="mt-4" value={mode} onChange={(m) => (setMode(m), form.resetFields())} options={MODES} />
          <Form form={form} layout="vertical" onFinish={submit} className="mt-4" disabled={busy}>
            <Flex gap={12} wrap>
              {mode === "PURCHASE" && (
                <>
                  <Form.Item label={`Boxes bought (× ${sel.packSize})`} name="packs"><InputNumber min={0} precision={0} /></Form.Item>
                  <Form.Item label="Plus loose pieces" name="pieces"><InputNumber min={0} precision={0} /></Form.Item>
                  <Form.Item label="New cost ₹ per piece (optional)" name="cost"><InputNumber min={0} precision={2} /></Form.Item>
                </>
              )}
              {mode === "COUNT" && <Form.Item label="Pieces you counted on the shelf" name="counted" rules={[{ required: true, message: "Enter the count" }]}><InputNumber min={0} precision={0} /></Form.Item>}
              {(mode === "DAMAGE" || mode === "RETURN") && <Form.Item label="Pieces" name="qty" rules={[{ required: true, message: "Enter how many" }]}><InputNumber min={1} precision={0} /></Form.Item>}
              <Form.Item label="Note (optional)" name="note" className="min-w-56 flex-1"><Input maxLength={200} /></Form.Item>
            </Flex>
            <Button type="primary" htmlType="submit" loading={busy}>Save</Button>
          </Form>

          <Typography.Title level={5} className="mt-6">Recent history</Typography.Title>
          <Table<Move> rowKey="_id" size="small" loading={!moves} columns={columns} dataSource={moves ?? []} pagination={false} scroll={{ y: 280, x: "max-content" }} locale={{ emptyText: "No movements yet" }} />
        </Card>
      )}
    </div>
  );
}
