"use client";

/**
 * /admin/requests — Buy list page (nav label "Buy list").
 * Next.js App Router page for that route; linked from src/lib/admin-nav.ts.
 * Rewrites the old Customer requests UI: same ItemRequest docs, dated buy list + purchase drawer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Grid,
  Empty,
  Flex,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { CameraOutlined, DeleteOutlined, PlusOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { ShopImage } from "@/components/shop-image";
import { api, inr } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";

type Status = "new" | "ordered" | "in_stock" | "declined";
type Source = "customer" | "admin" | "check";

interface Known {
  code: string;
  sellPrice: number;
  costPrice: number;
  stockOnHand: number;
  hasImage: boolean;
  productName?: string;
}

interface Req {
  _id: string;
  name: string;
  note?: string;
  phone?: string;
  imageUrl?: string;
  status: Status;
  createdAt: string;
  buyDate?: string | null;
  qty: number;
  source: Source;
  variantId?: string;
  known: Known | null;
}

interface PurchaseLine {
  key: string;
  requestId?: string;
  variantId?: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
  imageUrl?: string | null;
  needsPhoto: boolean;
  fromList: boolean;
}

interface Found {
  variantId: string;
  title: string;
  code: string;
  costPrice: number;
  sellPrice: number;
}

interface SupplierOpt {
  _id: string;
  name: string;
}

import { theme as antTheme } from "antd";

const SOURCE_TAG: Record<Source, { color: string; label: string }> = {
  customer: { color: "gold", label: "Customer" },
  admin: { color: "blue", label: "You added" },
  check: { color: "purple", label: "Shop check" },
};

export default function BuyListPage() {
  const { message, modal } = App.useApp();
  const me = useMe();
  const canBuy = can(me, "purchases") || can(me, "purchases:edit");
  const { token } = antTheme.useToken();
  const screens = Grid.useBreakpoint();
  const compact = !screens.md;
  const [date, setDate] = useState(() => dayjs());
  const [list, setList] = useState<Req[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [supplierId, setSupplierId] = useState<string>();
  const [supplierName, setSupplierName] = useState("");
  const [bill, setBill] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [found, setFound] = useState<Found[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateStr = date.format("YYYY-MM-DD");

  const load = useCallback(async () => {
    const d = await api<{ requests: Req[]; date: string }>(`/api/admin/requests?date=${dateStr}`);
    setList(d.requests);
    setSelected((ids) => ids.filter((id) => d.requests.some((r) => r._id === id)));
  }, [dateStr]);

  useEffect(() => {
    load().catch((e: Error) => message.error(e.message));
  }, [load, message]);

  const columns: TableColumnsType<Req> = [
    {
      title: "",
      key: "c",
      width: 48,
      render: (_: unknown, r) => (
        <Checkbox
          checked={selected.includes(r._id)}
          onChange={(e) => setSelected((ids) => (e.target.checked ? [...ids, r._id] : ids.filter((x) => x !== r._id)))}
          aria-label={`Select ${r.name}`}
        />
      ),
    },
    {
      title: "To buy",
      key: "n",
      render: (_: unknown, r) => (
        <Flex gap={12} align="center">
          {r.imageUrl && <span className="block w-12 shrink-0 overflow-hidden rounded-[8px]"><ShopImage src={r.imageUrl} alt="" width={96} sizes="48px" /></span>}
          <div className="min-w-0">
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            {r.known?.code && (
              <Typography.Text type="secondary" className="text-xs">
                In shop · {r.known.code} · stock {r.known.stockOnHand}
              </Typography.Text>
            )}
            {r.note && (
              <div>
                <Typography.Text type="secondary">{r.note}</Typography.Text>
              </div>
            )}
            {r.phone && (
              <div>
                <Typography.Text type="secondary" className="text-xs">
                  Phone {r.phone}
                </Typography.Text>
              </div>
            )}
          </div>
        </Flex>
      ),
    },
    { title: "Qty", dataIndex: "qty", width: 70, align: "right" },
    {
      title: "From",
      key: "src",
      width: 120,
      responsive: ["md"],
      render: (_: unknown, r) => {
        const t = SOURCE_TAG[r.source] ?? SOURCE_TAG.customer;
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    {
      title: "",
      key: "a",
      width: 90,
      render: (_: unknown, r) => (
        <Popconfirm title="Remove from buy list?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => drop(r)}>
          <Button danger type="text" icon={<DeleteOutlined />} aria-label={`Remove ${r.name}`} />
        </Popconfirm>
      ),
    },
  ];

  async function drop(r: Req) {
    try {
      await api(`/api/admin/requests/${r._id}`, { method: "DELETE" });
      message.success("Removed");
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  function startPurchase() {
    if (!list) return;
    const picks = list.filter((r) => selected.includes(r._id));
    if (!picks.length) message.info("No lines ticked — add extras in the purchase drawer.");
    const next: PurchaseLine[] = picks.map((r) => ({
      key: r._id,
      requestId: r._id,
      variantId: r.variantId,
      name: r.name,
      qty: r.qty || 1,
      cost: r.known ? r.known.costPrice / 100 : 0,
      price: r.known ? r.known.sellPrice / 100 : 0,
      imageUrl: r.imageUrl ?? null,
      needsPhoto: !r.imageUrl && !r.known?.hasImage,
      fromList: true,
    }));
    setLines(next);
    setSupplierId(undefined);
    setSupplierName("");
    setBill("");
    setNote("");
    setFound([]);
    setBuyOpen(true);
    api<{ suppliers: SupplierOpt[] }>("/api/admin/suppliers")
      .then((d) => setSuppliers(d.suppliers))
      .catch(() => {});
  }

  function searchExtra(q: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) return setFound([]);
    searchTimer.current = setTimeout(() => {
      api<{ items: Found[] }>(`/api/admin/purchases/items?q=${encodeURIComponent(q)}`)
        .then((d) => setFound(d.items))
        .catch(() => {});
    }, 200);
  }

  function addExisting(f: Found) {
    if (lines.some((l) => l.variantId === f.variantId)) {
      message.info("Already in the purchase. Change quantity instead.");
      return;
    }
    setLines((ls) => [
      ...ls,
      {
        key: `extra-${f.variantId}`,
        variantId: f.variantId,
        name: f.title,
        qty: 1,
        cost: f.costPrice / 100,
        price: f.sellPrice / 100,
        imageUrl: null,
        needsPhoto: false,
        fromList: false,
      },
    ]);
    setFound([]);
  }

  function addBlankExtra(name: string) {
    const n = name.trim();
    if (n.length < 2) return;
    setLines((ls) => [
      ...ls,
      {
        key: `new-${Date.now()}`,
        name: n,
        qty: 1,
        cost: 0,
        price: 0,
        imageUrl: null,
        needsPhoto: true,
        fromList: false,
      },
    ]);
  }

  async function uploadPhoto(key: string, file: File | undefined) {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Upload failed");
      setLines((ls) => ls.map((l) => (l.key === key ? { ...l, imageUrl: (data as { url: string }).url, needsPhoto: false } : l)));
      message.success("Photo added");
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  async function savePurchase() {
    if (!lines.length) {
      message.warning("Add at least one item");
      return;
    }
    for (const l of lines) {
      if (!l.name.trim()) return message.warning("Every line needs a name");
      if (!(l.price > 0)) return message.warning(`Add a selling price for "${l.name}"`);
    }
    const noPhoto = lines.filter((l) => l.needsPhoto && !l.imageUrl);
    if (noPhoto.length) {
      const ok = await new Promise<boolean>((resolve) =>
        modal.confirm({
          title: "Save without photos?",
          content: `${noPhoto.length} item(s) have no photo: ${noPhoto.map((l) => l.name).join(", ")}. Add photos later from Products.`,
          okText: "Save anyway",
          cancelText: "Go back",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        }),
      );
      if (!ok) return;
    }
    if (!supplierId && !supplierName.trim()) {
      message.warning("Choose or type a supplier");
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ clearedRequests: number; lines: number }>("/api/admin/buy-list/purchase", {
        method: "POST",
        body: {
          buyDate: dateStr,
          supplierId: supplierId || undefined,
          supplierName: supplierId ? undefined : supplierName.trim(),
          invoiceNo: bill.trim() || undefined,
          note: note.trim() || undefined,
          lines: lines.map((l) => ({
            requestId: l.requestId,
            variantId: l.variantId,
            name: l.name.trim(),
            qty: l.qty,
            cost: l.cost || 0,
            price: l.price,
            imageUrl: l.imageUrl || undefined,
          })),
        },
      });
      message.success(`Purchase saved (${r.lines} items). ${r.clearedRequests ? `${r.clearedRequests} list line(s) cleared.` : ""}`);
      setBuyOpen(false);
      setSelected([]);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const patchLine = (key: string, change: Partial<PurchaseLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const total = useMemo(() => lines.reduce((s, l) => s + l.qty * (l.cost || 0), 0), [lines]);

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="flex-start" gap={12} wrap>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Buy list
          </Typography.Title>
          <Typography.Text type="secondary">
            Customer asks and items you add — one list per day. Purchase from here; prices go onto products.
          </Typography.Text>
        </div>
        <Flex gap={8} wrap>
          <DatePicker value={date} onChange={(d) => d && setDate(d as Dayjs)} allowClear={false} format="DD MMM YYYY" aria-label="Buy list date" />
          <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Add to list
          </Button>
          {canBuy && (
            <Button type="primary" icon={<ShoppingCartOutlined />} onClick={startPurchase}>
              Record purchase{selected.length ? ` (${selected.length})` : ""}
            </Button>
          )}
        </Flex>
      </Flex>

      <Alert
        type="info"
        showIcon
        title="Same list for website asks and your own notes"
        description="Customers fill the site form, or you add here. Tick lines → Record purchase. You can also add extra items in the purchase that were not on the list."
      />

      {compact && list?.length ? (
        <Flex vertical gap={8}>
          {list.map((r) => {
            const src = SOURCE_TAG[r.source] ?? SOURCE_TAG.customer;
            return (
              <Card key={r._id} size="small" styles={{ body: { padding: 12 } }}>
                <Flex gap={10} align="start">
                  <Checkbox
                    checked={selected.includes(r._id)}
                    onChange={(e) => setSelected((ids) => (e.target.checked ? [...ids, r._id] : ids.filter((x) => x !== r._id)))}
                    aria-label={`Select ${r.name}`}
                    className="mt-1"
                  />
                  {r.imageUrl && <span className="block w-11 shrink-0 overflow-hidden rounded-[8px]"><ShopImage src={r.imageUrl} alt="" width={88} sizes="44px" /></span>}
                  <div className="min-w-0 flex-1">
                    <Flex justify="space-between" gap={8} align="start">
                      <div className="min-w-0">
                        <div style={{ fontWeight: 600, textWrap: "pretty" }}>{r.name}</div>
                        {r.known?.code && (
                          <Typography.Text type="secondary" className="text-xs">
                            In shop · {r.known.code} · stock {r.known.stockOnHand}
                          </Typography.Text>
                        )}
                        {r.note && (
                          <div>
                            <Typography.Text type="secondary">{r.note}</Typography.Text>
                          </div>
                        )}
                        {r.phone && (
                          <Typography.Text type="secondary" className="text-xs">
                            Phone {r.phone}
                          </Typography.Text>
                        )}
                      </div>
                      <Popconfirm title="Remove from buy list?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => drop(r)}>
                        <Button danger type="text" size="small" icon={<DeleteOutlined />} aria-label={`Remove ${r.name}`} />
                      </Popconfirm>
                    </Flex>
                    <Flex gap={8} align="center" className="mt-2" wrap>
                      <Tag color={src.color} style={{ margin: 0 }}>{src.label}</Tag>
                      <Typography.Text type="secondary" className="text-xs tabular-nums">
                        Qty {r.qty}
                      </Typography.Text>
                    </Flex>
                  </div>
                </Flex>
              </Card>
            );
          })}
        </Flex>
      ) : (
      <Card styles={{ body: { padding: 0 } }}>
        <Table<Req>
          rowKey="_id"
          loading={!list}
          columns={columns}
          dataSource={list ?? []}
          pagination={{ pageSize: 30, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    Nothing for {date.format("DD MMM")}. Tap <strong>Add to list</strong> or wait for a customer ask.
                  </span>
                }
              />
            ),
          }}
        />
      </Card>
      )}
      {compact && list && list.length === 0 && (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                Nothing for {date.format("DD MMM")}. Tap <strong>Add to list</strong> or wait for a customer ask.
              </span>
            }
          />
        </Card>
      )}

      <AddToListModal
        open={addOpen}
        buyDate={dateStr}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await load();
        }}
      />

      <Drawer
        open={buyOpen}
        onClose={() => setBuyOpen(false)}
        title={`Purchase — ${date.format("DD MMM YYYY")}`}
        width={Math.min(560, typeof window !== "undefined" ? window.innerWidth : 560)}
        destroyOnHidden
      >
        <Flex vertical gap={12}>
          <Typography.Text type="secondary">
            Set cost and selling price for each line. New names are added to Products. Photo is asked when the item has none.
          </Typography.Text>

          <Select
            showSearch
            allowClear
            placeholder="Supplier (or type a new name below)"
            optionFilterProp="label"
            value={supplierId}
            onChange={(v) => {
              setSupplierId(v);
              if (v) setSupplierName("");
            }}
            options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
            style={{ width: "100%" }}
          />
          {!supplierId && <Input placeholder="New supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} maxLength={80} />}
          <Input placeholder="Bill / invoice no. (optional)" value={bill} onChange={(e) => setBill(e.target.value)} maxLength={40} />
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />

          {lines.map((l) => (
            <Card key={l.key} size="small" styles={{ body: { padding: 12 } }}>
              <Flex vertical gap={8}>
                <Flex justify="space-between" gap={8} align="start">
                  <Input value={l.name} onChange={(e) => patchLine(l.key, { name: e.target.value })} disabled={!!l.variantId} style={{ fontWeight: 600 }} />
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line" />
                </Flex>
                <Flex gap={8} wrap>
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      Qty
                    </Typography.Text>
                    <InputNumber min={1} value={l.qty} onChange={(v) => patchLine(l.key, { qty: Number(v) || 1 })} style={{ width: 80 }} />
                  </div>
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      Cost ₹
                    </Typography.Text>
                    <InputNumber min={0} value={l.cost} onChange={(v) => patchLine(l.key, { cost: Number(v) || 0 })} style={{ width: 100 }} />
                  </div>
                  <div>
                    <Typography.Text type="secondary" className="text-xs">
                      Sell ₹
                    </Typography.Text>
                    <InputNumber min={0} value={l.price} onChange={(v) => patchLine(l.key, { price: Number(v) || 0 })} style={{ width: 100 }} />
                  </div>
                </Flex>
                {(l.needsPhoto || !l.imageUrl) && (
                  <Flex gap={8} align="center" wrap>
                    {l.imageUrl ? (
                      <span className="block w-10 shrink-0 overflow-hidden rounded-[6px]"><ShopImage src={l.imageUrl} alt="" width={80} sizes="40px" /></span>
                    ) : (
                      <Tag color="orange">Photo?</Tag>
                    )}
                    <label className="inline-flex">
                      <span className="inline-flex">
                        <Button icon={<CameraOutlined />} size="small" onClick={(e) => (e.currentTarget.parentElement?.parentElement?.querySelector("input") as HTMLInputElement | null)?.click()}>
                          {l.imageUrl ? "Change photo" : "Add photo"}
                        </Button>
                      </span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(e) => uploadPhoto(l.key, e.target.files?.[0])} />
                    </label>
                  </Flex>
                )}
                {!l.fromList && <Tag>Extra (not on list)</Tag>}
              </Flex>
            </Card>
          ))}

          <Card size="small" title="Add more (even if not on the list)">
            <Input.Search
              placeholder="Search shop items…"
              allowClear
              onChange={(e) => searchExtra(e.target.value)}
              onSearch={(q) => {
                if (found[0]) addExisting(found[0]);
                else addBlankExtra(q);
              }}
              enterButton="Add"
            />
            {found.length > 0 && (
              <ul className="m-0 mt-2 list-none p-0">
                {found.map((f) => (
                  <li key={f.variantId}>
                    <Button type="link" onClick={() => addExisting(f)} style={{ paddingInline: 0 }}>
                      {f.code && <Typography.Text code>{f.code}</Typography.Text>} {f.title} · cost {inr(f.costPrice)}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Typography.Paragraph type="secondary" className="mb-0 mt-2 text-xs">
              Type a new name and press Add if it is not in the shop yet — it will be created with your prices.
            </Typography.Paragraph>
          </Card>

          <div
            className="sticky -mx-6 -mb-6 mt-2 px-6 py-3"
            style={{
              bottom: 0,
              paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))",
              background: token.colorBgContainer,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Button type="primary" size="large" block loading={saving} onClick={savePurchase}>
              Save purchase · ₹{total.toFixed(0)}
            </Button>
          </div>
        </Flex>
      </Drawer>
    </div>
  );
}

function AddToListModal({
  open,
  buyDate,
  onClose,
  onSaved,
}: {
  open: boolean;
  buyDate: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setNote("");
      setQty(1);
    }
  }, [open]);

  async function save() {
    if (name.trim().length < 2) {
      message.warning("Enter what to buy");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/requests", {
        method: "POST",
        body: { name: name.trim(), note: note.trim() || undefined, qty, buyDate, source: "admin" },
      });
      message.success("Added to buy list");
      await onSaved();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Add to buy list" onCancel={onClose} destroyOnHidden footer={null}>
      <Flex vertical gap={12}>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="bl-name">
            Item
          </label>
          <Input id="bl-name" size="large" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apsara platinum pencil" maxLength={120} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="bl-qty">
            How many
          </label>
          <InputNumber id="bl-qty" min={1} value={qty} onChange={(v) => setQty(Number(v) || 1)} style={{ width: "100%" }} size="large" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="bl-note">
            Note (optional)
          </label>
          <Input id="bl-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Customer name, colour, size…" />
        </div>
        <Flex justify="flex-end">
          <Button type="primary" size="large" loading={busy} onClick={save}>
            Add
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
