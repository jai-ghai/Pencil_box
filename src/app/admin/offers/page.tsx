"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Alert, App, Button, Card, Col, DatePicker, Drawer, Empty, Flex, Form, Grid, Input, InputNumber, Popconfirm, Popover, Row, Segmented, Select, Switch, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api, inr, itemTitle } from "@/lib/client";

interface Opt { _id: string; name?: string; name_en?: string; parentId?: string | null }
interface Item { variantId: string; name: string; brand: string; label: string; shortCode: string }
interface OfferDoc {
  _id: string; type: OfferType; active: boolean; label_en: string; label_hi?: string;
  buyQty?: number; freeQty?: number; bundleQty?: number; bundlePrice?: number; percent?: number; flatOff?: number; slabMinQty?: number; slabPrice?: number;
  scope?: { variantIds?: string[]; categoryIds?: string[]; brandIds?: string[] };
  startsAt?: string; endsAt?: string;
  scopeItems: { value: string; label: string }[];
  coveredCount: number;
  /** lowest profit share across the covered items (0.25 = 25%), null when costs are not entered */
  lowestProfit: number | null;
  losing: number;
}
type OfferType = "BUY_X_GET_Y" | "BUNDLE" | "PERCENT" | "FLAT" | "SLAB";
interface OfferForm {
  type: OfferType;
  buyQty?: number; freeQty?: number; bundleQty?: number; bundlePrice?: number; percent?: number; flatOff?: number; slabMinQty?: number; slabPrice?: number;
  categoryIds?: string[]; brandIds?: string[]; items?: { value: string; label: string }[];
  label_en: string; label_hi?: string;
  range?: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
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

/** The profit check shown on every offer. */
function ProfitTag({ o }: { o: OfferDoc }) {
  if (o.coveredCount === 0) return <Tag>No items</Tag>;
  if (o.lowestProfit === null) return <Tag>Cost not entered</Tag>;
  const pct = Math.round(o.lowestProfit * 100);
  if (o.losing > 0 || pct < 0) return <Tag color="red">Loses money on {o.losing || "some"} item{o.losing === 1 ? "" : "s"}</Tag>;
  return <Tag color={pct >= 20 ? "green" : pct >= 10 ? "orange" : "red"}>Profit at least {pct}%</Tag>;
}

const blank = (): Partial<OfferForm> => ({ type: "BUY_X_GET_Y", buyQty: 6, freeQty: 1, categoryIds: [], brandIds: [], items: [] });

function toForm(o: OfferDoc, copy: boolean): Partial<OfferForm> {
  const rupees = (p?: number) => (p === undefined ? undefined : p / 100);
  return {
    type: o.type, buyQty: o.buyQty, freeQty: o.freeQty, bundleQty: o.bundleQty, bundlePrice: rupees(o.bundlePrice), percent: o.percent, flatOff: rupees(o.flatOff),
    slabMinQty: o.slabMinQty, slabPrice: rupees(o.slabPrice),
    categoryIds: o.scope?.categoryIds ?? [], brandIds: o.scope?.brandIds ?? [], items: o.scopeItems,
    label_en: copy ? `${o.label_en} (copy)` : o.label_en, label_hi: o.label_hi,
    range: o.startsAt || o.endsAt ? [o.startsAt ? dayjs(o.startsAt) : null, o.endsAt ? dayjs(o.endsAt) : null] : null,
  };
}

export default function Offers() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<OfferForm>();
  const type = Form.useWatch("type", form) ?? "BUY_X_GET_Y";
  const [offers, setOffers] = useState<OfferDoc[] | null>(null);
  const [cats, setCats] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [found, setFound] = useState<Item[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // offer id, or "new"
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "on" | "off">("all");
  const [brandFilter, setBrandFilter] = useState<string | undefined>(undefined);
  const [picked, setPicked] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => setOffers((await api<{ offers: OfferDoc[] }>("/api/admin/offers")).offers), []);
  useEffect(() => {
    Promise.all([api<{ offers: OfferDoc[] }>("/api/admin/offers"), api<{ categories: Opt[] }>("/api/admin/categories"), api<{ brands: Opt[] }>("/api/admin/brands")])
      .then(([o, c, b]) => (setOffers(o.offers), setCats(c.categories), setBrands(b.brands)))
      .catch((e: Error) => message.error(e.message));
  }, [message]);

  const catName = useMemo(() => new Map(cats.map((c) => [c._id, c.name_en ?? ""])), [cats]);
  const brandName = useMemo(() => new Map(brands.map((b) => [b._id, b.name ?? ""])), [brands]);
  const categoryOptions = useMemo(() => {
    const tops = cats.filter((c) => !c.parentId);
    return tops.map((t) => {
      const kids = cats.filter((c) => c.parentId === t._id);
      return { label: t.name_en, options: [{ value: t._id, label: `All ${t.name_en}` }, ...kids.map((k) => ({ value: k._id, label: k.name_en }))] };
    });
  }, [cats]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (offers ?? []).filter((o) => {
      if (state === "on" && !o.active) return false;
      if (state === "off" && o.active) return false;
      if (brandFilter && !o.scope?.brandIds?.includes(brandFilter)) return false;
      const hay = `${o.label_en} ${o.label_hi ?? ""} ${describe(o)}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [offers, q, state, brandFilter]);
  const onCount = (offers ?? []).filter((o) => o.active).length;

  function searchItems(text: string) {
    if (timer.current) clearTimeout(timer.current);
    if (!text.trim()) return setFound([]);
    timer.current = setTimeout(() => api<{ items: Item[] }>(`/api/pos/search?q=${encodeURIComponent(text)}`).then((d) => setFound(d.items)).catch(() => {}), 200);
  }

  function open(o?: OfferDoc, copy = false) {
    form.resetFields();
    form.setFieldsValue(o ? toForm(o, copy) : blank());
    setFound([]);
    setEditing(o && !copy ? o._id : "new");
  }

  async function save(v: OfferForm) {
    const kind =
      v.type === "BUY_X_GET_Y" ? { buyQty: v.buyQty, freeQty: v.freeQty }
      : v.type === "BUNDLE" ? { bundleQty: v.bundleQty, bundlePrice: v.bundlePrice }
      : v.type === "PERCENT" ? { percent: v.percent }
      : v.type === "FLAT" ? { flatOff: v.flatOff }
      : { slabMinQty: v.slabMinQty, slabPrice: v.slabPrice };
    const body = {
      type: v.type, ...kind, label_en: v.label_en.trim(), label_hi: v.label_hi?.trim() || undefined,
      variantIds: (v.items ?? []).map((i) => i.value), categoryIds: v.categoryIds ?? [], brandIds: v.brandIds ?? [],
      // dates are IST days: the offer runs from 00:00 on the first day to 23:59 on the last
      startsAt: v.range?.[0] ? new Date(`${v.range[0].format("YYYY-MM-DD")}T00:00:00+05:30`).toISOString() : undefined,
      endsAt: v.range?.[1] ? new Date(`${v.range[1].format("YYYY-MM-DD")}T23:59:59+05:30`).toISOString() : undefined,
    };
    setBusy(true);
    try {
      if (editing === "new") {
        await api("/api/admin/offers", { body });
        message.success("Offer created, switched OFF. Turn it on when you are ready.");
      } else {
        await api(`/api/admin/offers/${editing}`, { method: "PUT", body });
        message.success("Offer saved");
      }
      setEditing(null);
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setActive(ids: string[], active: boolean) {
    try {
      await Promise.all(ids.map((id) => api(`/api/admin/offers/${id}`, { method: "PATCH", body: { active } })));
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  }
  async function remove(ids: string[]) {
    try {
      await Promise.all(ids.map((id) => api(`/api/admin/offers/${id}`, { method: "DELETE" })));
      setPicked([]);
      message.success(ids.length === 1 ? "Offer deleted" : `${ids.length} offers deleted`);
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const columns: TableColumnsType<OfferDoc> = [
    {
      title: "Offer",
      key: "o",
      render: (_: unknown, o) => (
        <div>
          <div style={{ fontWeight: 600 }}>{o.label_en}</div>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {describe(o)}
            {o.startsAt && ` · from ${o.startsAt.slice(0, 10)}`}{o.endsAt && ` · until ${o.endsAt.slice(0, 10)}`}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Applies to",
      key: "t",
      responsive: ["md"],
      render: (_: unknown, o) => {
        const s = o.scope ?? {};
        const itemCount = s.variantIds?.length ?? 0;
        return (
          <Flex gap={4} wrap>
            {(s.brandIds ?? []).map((id) => <Tag key={id} color="blue" style={{ margin: 0 }}>{brandName.get(id) ?? "Brand"}</Tag>)}
            {(s.categoryIds ?? []).map((id) => <Tag key={id} color="purple" style={{ margin: 0 }}>{catName.get(id) ?? "Category"}</Tag>)}
            {itemCount > 0 && (
              <Popover title={`${itemCount} items`} content={<div style={{ maxWidth: 320, maxHeight: 260, overflow: "auto" }}>{o.scopeItems.map((i) => <div key={i.value}>{i.label}</div>)}</div>}>
                <Tag style={{ margin: 0, cursor: "pointer" }}>{itemCount} item{itemCount === 1 ? "" : "s"}</Tag>
              </Popover>
            )}
          </Flex>
        );
      },
    },
    { title: "Profit check", key: "p", responsive: ["lg"], render: (_: unknown, o) => <ProfitTag o={o} /> },
    { title: "On", key: "a", width: 80, render: (_: unknown, o) => <Switch checked={o.active} aria-label={`Turn ${o.label_en} ${o.active ? "off" : "on"}`} onChange={(active) => setActive([o._id], active)} /> },
    {
      title: "",
      key: "x",
      width: 190,
      render: (_: unknown, o) => (
        <Flex gap={6}>
          <Button icon={<EditOutlined />} onClick={() => open(o)}>Edit</Button>
          <Button icon={<CopyOutlined />} aria-label={`Copy ${o.label_en}`} onClick={() => open(o, true)} />
          <Popconfirm title={`Delete "${o.label_en}"?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove([o._id])}>
            <Button danger icon={<DeleteOutlined />} aria-label={`Delete ${o.label_en}`} />
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Offers</Typography.Title>
          <Typography.Text type="secondary">{offers ? `${onCount} of ${offers.length} offers are on` : "Loading…"}</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open()}>New offer</Button>
      </Flex>

      <Flex gap={12} wrap align="center">
        <Input.Search placeholder="Search offers" allowClear value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
        <Segmented<"all" | "on" | "off"> value={state} onChange={setState} options={[{ label: "All", value: "all" }, { label: "On", value: "on" }, { label: "Off", value: "off" }]} />
        <Select allowClear showSearch={{ optionFilterProp: "label" }} placeholder="Filter by brand" value={brandFilter} onChange={setBrandFilter} style={{ width: 200 }} options={brands.map((b) => ({ value: b._id, label: b.name }))} />
      </Flex>

      {picked.length > 0 && (
        <Flex gap={8} align="center" wrap>
          <Typography.Text strong>{picked.length} selected</Typography.Text>
          <Button onClick={() => setActive(picked, true)}>Turn on</Button>
          <Button onClick={() => setActive(picked, false)}>Turn off</Button>
          <Popconfirm title={`Delete ${picked.length} offers?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(picked)}><Button danger>Delete</Button></Popconfirm>
          <Button type="text" onClick={() => setPicked([])}>Clear</Button>
        </Flex>
      )}

      <Card styles={{ body: { padding: 0 } }}>
        <Table<OfferDoc>
          rowKey="_id"
          loading={!offers}
          columns={columns}
          dataSource={shown}
          rowSelection={{ selectedRowKeys: picked, onChange: (k) => setPicked(k as string[]) }}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={offers?.length ? "No offers match." : "No offers yet. Tap New offer."} /> }}
        />
      </Card>
      <Alert type="info" showIcon title="An offer applies to the billing screen and the website cart at the same time. It counts units of the same item, and only the single best offer applies to each item. The profit check uses your cost prices: fix any red offer before turning it on." />

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New offer" : "Edit offer"}
        size={screens.md ? 720 : "100%"}
        extra={<Flex gap={8}><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="primary" loading={busy} onClick={() => form.submit()}>Save offer</Button></Flex>}
      >
        <Form<OfferForm> form={form} layout="vertical" onFinish={save} disabled={busy} requiredMark>
          <Row gutter={16}>
            <Col xs={24}><Form.Item label="Offer type" name="type"><Select options={(Object.keys(TYPE_LABEL) as OfferType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} /></Form.Item></Col>
            {type === "BUY_X_GET_Y" && (
              <>
                <Col xs={12} md={8}><Form.Item label="Customer buys" name="buyQty" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={12} md={8}><Form.Item label="Gets free" name="freeQty" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
            {type === "BUNDLE" && (
              <>
                <Col xs={12} md={8}><Form.Item label="Items in bundle" name="bundleQty" rules={[{ required: true }]}><InputNumber min={2} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={12} md={8}><Form.Item label="Bundle price ₹" name="bundlePrice" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
            {type === "PERCENT" && <Col xs={12} md={8}><Form.Item label="Percent off" name="percent" rules={[{ required: true }]}><InputNumber min={1} max={100} precision={0} suffix="%" style={{ width: "100%" }} /></Form.Item></Col>}
            {type === "FLAT" && <Col xs={12} md={8}><Form.Item label="₹ off each" name="flatOff" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: "100%" }} /></Form.Item></Col>}
            {type === "SLAB" && (
              <>
                <Col xs={12} md={8}><Form.Item label="From quantity" name="slabMinQty" rules={[{ required: true }]}><InputNumber min={2} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={12} md={8}><Form.Item label="Price ₹ each" name="slabPrice" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
          </Row>

          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>Applies to (pick at least one: a brand, a category, or specific items)</Typography.Text>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Brands" name="brandIds"><Select mode="multiple" allowClear placeholder="Choose brands" options={brands.map((b) => ({ value: b._id, label: b.name }))} showSearch={{ optionFilterProp: "label" }} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Categories" name="categoryIds"><Select mode="multiple" allowClear placeholder="Choose categories" options={categoryOptions} showSearch={{ optionFilterProp: "label" }} /></Form.Item></Col>
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
        </Form>
      </Drawer>
    </div>
  );
}
