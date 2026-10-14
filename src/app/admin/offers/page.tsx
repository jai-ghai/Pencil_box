"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Popconfirm, Row, Select, Switch, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { api, inr, itemTitle } from "@/lib/client";

interface Opt { _id: string; name?: string; name_en?: string; parentId?: string | null }
interface Item { variantId: string; name: string; brand: string; label: string; shortCode: string }
interface OfferDoc {
  _id: string; type: string; active: boolean; label_en: string; label_hi?: string;
  buyQty?: number; freeQty?: number; bundleQty?: number; bundlePrice?: number; percent?: number; flatOff?: number; slabMinQty?: number; slabPrice?: number;
  scope?: { variantIds?: string[]; categoryIds?: string[]; brandIds?: string[] };
  startsAt?: string; endsAt?: string;
}
type OfferType = "BUY_X_GET_Y" | "BUNDLE" | "PERCENT" | "FLAT" | "SLAB";
interface OfferForm {
  type: OfferType;
  buyQty?: number; freeQty?: number; bundleQty?: number; bundlePrice?: number; percent?: number; flatOff?: number; slabMinQty?: number; slabPrice?: number;
  categoryIds?: string[]; brandIds?: string[]; items?: { value: string; label: string }[];
  label_en: string; label_hi?: string;
  range?: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] | null;
}

const TYPE_LABEL: Record<OfferType, string> = {
  BUY_X_GET_Y: "Buy X, get Y free",
  BUNDLE: "Bundle price (N for ₹)",
  PERCENT: "Percent off",
  FLAT: "₹ off per piece",
  SLAB: "Bulk price (N or more at ₹ each)",
};

function describe(o: OfferDoc) {
  switch (o.type) {
    case "BUY_X_GET_Y": return `Buy ${o.buyQty}, get ${o.freeQty} free`;
    case "BUNDLE": return `${o.bundleQty} for ${inr(o.bundlePrice ?? 0)}`;
    case "PERCENT": return `${o.percent}% off`;
    case "FLAT": return `${inr(o.flatOff ?? 0)} off each`;
    case "SLAB": return `${o.slabMinQty}+ at ${inr(o.slabPrice ?? 0)} each`;
    default: return o.type;
  }
}

export default function Offers() {
  const { message } = App.useApp();
  const [form] = Form.useForm<OfferForm>();
  const type = Form.useWatch("type", form) ?? "BUY_X_GET_Y";
  const [offers, setOffers] = useState<OfferDoc[] | null>(null);
  const [cats, setCats] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [found, setFound] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([api<{ offers: OfferDoc[] }>("/api/admin/offers"), api<{ categories: Opt[] }>("/api/admin/categories"), api<{ brands: Opt[] }>("/api/admin/brands")])
      .then(([o, c, b]) => (setOffers(o.offers), setCats(c.categories), setBrands(b.brands)))
      .catch((e: Error) => message.error(e.message));
  }, [message]);

  const categoryOptions = useMemo(() => {
    const tops = cats.filter((c) => !c.parentId);
    return tops.map((t) => {
      const kids = cats.filter((c) => c.parentId === t._id);
      return { label: t.name_en, options: [{ value: t._id, label: `All ${t.name_en}` }, ...kids.map((k) => ({ value: k._id, label: k.name_en }))] };
    });
  }, [cats]);

  function searchItems(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) return setFound([]);
    timer.current = setTimeout(() => api<{ items: Item[] }>(`/api/pos/search?q=${encodeURIComponent(q)}`).then((d) => setFound(d.items)).catch(() => {}), 200);
  }

  async function create(v: OfferForm) {
    const kind =
      v.type === "BUY_X_GET_Y" ? { buyQty: v.buyQty, freeQty: v.freeQty }
      : v.type === "BUNDLE" ? { bundleQty: v.bundleQty, bundlePrice: v.bundlePrice }
      : v.type === "PERCENT" ? { percent: v.percent }
      : v.type === "FLAT" ? { flatOff: v.flatOff }
      : { slabMinQty: v.slabMinQty, slabPrice: v.slabPrice };
    setBusy(true);
    try {
      await api("/api/admin/offers", {
        body: {
          type: v.type, ...kind, label_en: v.label_en.trim(), label_hi: v.label_hi?.trim() || undefined,
          variantIds: (v.items ?? []).map((i) => i.value), categoryIds: v.categoryIds ?? [], brandIds: v.brandIds ?? [],
          // dates are IST days: the offer runs from 00:00 on the first day to 23:59 on the last
          startsAt: v.range?.[0] ? v.range[0].format("YYYY-MM-DD") && new Date(`${v.range[0].format("YYYY-MM-DD")}T00:00:00+05:30`).toISOString() : undefined,
          endsAt: v.range?.[1] ? new Date(`${v.range[1].format("YYYY-MM-DD")}T23:59:59+05:30`).toISOString() : undefined,
        },
      });
      message.success("Offer created. It now applies on the billing screen and the website.");
      form.resetFields();
      setOffers((await api<{ offers: OfferDoc[] }>("/api/admin/offers")).offers);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    setOffers((await api<{ offers: OfferDoc[] }>("/api/admin/offers")).offers);
  }

  const columns: TableColumnsType<OfferDoc> = [
    {
      title: "Offer",
      key: "o",
      render: (_: unknown, o) => (
        <div>
          <div style={{ fontWeight: 600 }}>{o.label_en}</div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {describe(o)} · {(o.scope?.categoryIds?.length ?? 0) + (o.scope?.brandIds?.length ?? 0) + (o.scope?.variantIds?.length ?? 0)} targets
            {o.startsAt && ` · from ${o.startsAt.slice(0, 10)}`}{o.endsAt && ` · until ${o.endsAt.slice(0, 10)}`}
          </Typography.Text>
        </div>
      ),
    },
    { title: "On", key: "a", width: 80, render: (_: unknown, o) => <Switch checked={o.active} aria-label={`Turn ${o.label_en} ${o.active ? "off" : "on"}`} onChange={async (active) => { try { await api(`/api/admin/offers/${o._id}`, { method: "PATCH", body: { active } }); await reload(); } catch (e) { message.error((e as Error).message); } }} /> },
    { title: "", key: "d", width: 100, render: (_: unknown, o) => <Popconfirm title={`Delete "${o.label_en}"?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={async () => { try { await api(`/api/admin/offers/${o._id}`, { method: "DELETE" }); await reload(); } catch (e) { message.error((e as Error).message); } }}><Button danger>Delete</Button></Popconfirm> },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Offers</Typography.Title>

      <Card title="New offer">
        <Form<OfferForm> form={form} layout="vertical" onFinish={create} initialValues={{ type: "BUY_X_GET_Y", buyQty: 6, freeQty: 1 }} disabled={busy} requiredMark>
          <Row gutter={16}>
            <Col xs={24}><Form.Item label="Offer type" name="type"><Select options={(Object.keys(TYPE_LABEL) as OfferType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} /></Form.Item></Col>
            {type === "BUY_X_GET_Y" && (
              <>
                <Col xs={12} md={6}><Form.Item label="Customer buys" name="buyQty" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item label="Gets free" name="freeQty" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
            {type === "BUNDLE" && (
              <>
                <Col xs={12} md={6}><Form.Item label="Items in bundle" name="bundleQty" rules={[{ required: true }]}><InputNumber min={2} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item label="Bundle price ₹" name="bundlePrice" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
            {type === "PERCENT" && <Col xs={12} md={6}><Form.Item label="Percent off" name="percent" rules={[{ required: true }]}><InputNumber min={1} max={100} precision={0} suffix="%" style={{ width: "100%" }} /></Form.Item></Col>}
            {type === "FLAT" && <Col xs={12} md={6}><Form.Item label="₹ off each" name="flatOff" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: "100%" }} /></Form.Item></Col>}
            {type === "SLAB" && (
              <>
                <Col xs={12} md={6}><Form.Item label="From quantity" name="slabMinQty" rules={[{ required: true }]}><InputNumber min={2} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item label="Price ₹ each" name="slabPrice" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
          </Row>

          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>Applies to (pick at least one)</Typography.Text>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Categories" name="categoryIds"><Select mode="multiple" allowClear placeholder="Choose categories" options={categoryOptions} showSearch={{ optionFilterProp: "label" }} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Brands" name="brandIds"><Select mode="multiple" allowClear placeholder="Choose brands" options={brands.map((b) => ({ value: b._id, label: b.name }))} showSearch={{ optionFilterProp: "label" }} /></Form.Item></Col>
            <Col xs={24}>
              <Form.Item label="Specific items" name="items">
                <Select
                  mode="multiple"
                  labelInValue
                  allowClear
                  placeholder="Type to search items"
                  showSearch={{ filterOption: false, onSearch: searchItems }}
                  options={found.map((i) => ({ value: i.variantId, label: `${itemTitle(i)}${i.shortCode ? ` [${i.shortCode.toUpperCase()}]` : ""}` }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Label shown to customers (English)" name="label_en" rules={[{ required: true, message: "Enter a label" }]}><Input placeholder="Buy 6 Get 1 Free" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="लेबल (हिंदी)" name="label_hi"><Input placeholder="6 खरीदें 1 फ्री पाएं" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Runs from / until (optional)" name="range"><DatePicker.RangePicker style={{ width: "100%", maxWidth: 360 }} allowEmpty={[true, true]} /></Form.Item></Col>
          </Row>
          <Button type="primary" htmlType="submit" loading={busy}>Create offer</Button>
        </Form>
      </Card>

      <Card title="Your offers" styles={{ body: { padding: 0 } }}>
        <Table<OfferDoc> rowKey="_id" loading={!offers} columns={columns} dataSource={offers ?? []} pagination={false} scroll={{ x: "max-content" }} locale={{ emptyText: "No offers yet" }} />
      </Card>
      <Alert type="info" showIcon title="An offer applies to the billing screen and the website cart at the same time. Only the single best offer applies to each item." />
    </div>
  );
}
