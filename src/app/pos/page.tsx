"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Card, Col, Drawer, Empty, Flex, Input, InputNumber, Modal, Row, Statistic, Table, Tag, Typography, theme } from "antd";
import type { InputRef, TableColumnsType } from "antd";
import { CloseOutlined, DeleteOutlined, FileTextOutlined, QrcodeOutlined, SearchOutlined, WalletOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleList } from "@/components/simple-list";
import { BillsTable, type Bill } from "@/components/bills-table";
import { api, inr, itemTitle } from "@/lib/client";
import { BRAND } from "@/lib/theme";
import { parseOrderText } from "@/lib/whatsapp";

interface Item {
  variantId: string;
  name: string;
  brand: string;
  label: string;
  shortCode: string;
  sellPrice: number;
  stockOnHand: number;
}
interface CartLine {
  variantId: string;
  name: string;
  qty: number;
}
interface PricedLine {
  variantId: string;
  name: string;
  qty: number;
  freeUnits: number;
  unitPrice: number;
  baseTotal: number;
  discount: number;
  lineTotal: number;
  offerLabel_en?: string;
  nudge?: { addQty: number; label_en: string };
  stockOnHand: number;
}
interface Priced {
  /** false while stock limits are switched off: no "only N in stock" warning */
  stockLimits?: boolean;
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  total: number;
}
type PayMode = "cash" | "upi";

export default function PosPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const searchRef = useRef<InputRef>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [quick, setQuick] = useState<Item[]>([]);
  const [hi, setHi] = useState(0);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pricedRaw, setPriced] = useState<Priced | null>(null);
  const [received, setReceived] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [bills, setBills] = useState<{ bills: Bill[]; summary: { bills: number; total: number; cash: number; upi: number } } | null>(null);
  const priceSeq = useRef(0);
  // a pasted WhatsApp order: kept with the bill so the order is saved, not just the sale
  const [waOpen, setWaOpen] = useState(false);
  const [waDraft, setWaDraft] = useState("");
  const [waSaved, setWaSaved] = useState("");

  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  const priced = cart.length ? pricedRaw : null; // no cart, no price

  /* quick-tap items load once */
  useEffect(() => {
    api<{ items: Item[] }>("/api/pos/search").then((d) => setQuick(d.items)).catch(() => {});
  }, []);

  /* debounced type-to-find ("5*dpn" means five of dpn) */
  useEffect(() => {
    const m = /^(\d+)\*(.*)$/.exec(query);
    const q = (m ? m[2] : query).trim();
    if (!q) return;
    const t = setTimeout(() => {
      api<{ items: Item[] }>(`/api/pos/search?q=${encodeURIComponent(q)}`)
        .then((d) => {
          setResults(d.items);
          setHi(0);
        })
        .catch(() => {});
    }, 120);
    return () => clearTimeout(t);
  }, [query]);

  /* live pricing, always from the server so the screen matches the final bill */
  useEffect(() => {
    if (!cart.length) return;
    const seq = ++priceSeq.current;
    const t = setTimeout(() => {
      api<Priced>("/api/pos/price", { body: { items: cart.map((c) => ({ variantId: c.variantId, qty: c.qty })) } })
        .then((p) => seq === priceSeq.current && setPriced(p))
        .catch((e: Error) => message.error(e.message));
    }, 100);
    return () => clearTimeout(t);
  }, [cart, message]);

  const add = useCallback((item: Item, qty = 1) => {
    setCart((c) => {
      const i = c.findIndex((l) => l.variantId === item.variantId);
      if (i >= 0) return c.map((l, k) => (k === i ? { ...l, qty: l.qty + qty } : l));
      return [...c, { variantId: item.variantId, name: itemTitle(item), qty }];
    });
  }, []);

  const setQty = (variantId: string, qty: number) => setCart((c) => (qty < 1 ? c.filter((l) => l.variantId !== variantId) : c.map((l) => (l.variantId === variantId ? { ...l, qty } : l))));

  const clear = useCallback(() => {
    setCart([]);
    setWaSaved("");
    setReceived(null);
    setQuery("");
    focusSearch();
  }, [focusSearch]);

  const pay = useCallback(
    async (mode: PayMode) => {
      if (!priced || busy) return;
      setBusy(true);
      try {
        const out = await api<{ billNo: number; total: number; warnings: string[] }>("/api/pos/sale", {
          body: { items: cart.map((c) => ({ variantId: c.variantId, qty: c.qty })), payments: { cash: 0, upi: 0, [mode]: priced.total }, ...(waSaved ? { source: "whatsapp", waText: waSaved } : {}) },
        });
        clear();
        message.success({ content: `Bill #${out.billNo} saved · ${inr(out.total)} · ${mode === "upi" ? "UPI" : "Cash"}`, duration: 4 });
        out.warnings.forEach((w) => message.warning({ content: w, duration: 6 }));
      } catch (e) {
        message.error((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [priced, busy, cart, clear, message, waSaved],
  );

  /* keyboard shortcuts: F2 or / search, F8 cash, F9 UPI */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.key === "/" && document.activeElement?.tagName !== "INPUT")) (e.preventDefault(), focusSearch());
      else if (e.key === "F8") (e.preventDefault(), pay("cash"));
      else if (e.key === "F9") (e.preventDefault(), pay("upi"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pay, focusSearch]);

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(h + 1, results.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(h - 1, 0)));
    else if (e.key === "Escape") setQuery("");
    else if (e.key === "Enter" && query.trim() && results[hi]) {
      e.preventDefault();
      const m = /^(\d+)\*/.exec(query);
      add(results[hi], m ? Math.min(parseInt(m[1], 10), 100000) : 1);
      setQuery("");
    }
  }

  /** Fill the bill from a customer's WhatsApp message (the lines the website writes, with item codes). */
  async function pasteOrder() {
    const wanted = parseOrderText(waDraft);
    if (!wanted.length) {
      message.warning("No item codes found. Paste the whole order message from WhatsApp.");
      return;
    }
    try {
      const { items, missing } = await api<{ items: Item[]; missing: string[] }>("/api/pos/by-codes", { body: { codes: wanted.map((w) => w.code) } });
      const byCode = new Map(items.map((i) => [i.shortCode.toUpperCase(), i]));
      let added = 0;
      for (const w of wanted) {
        const item = byCode.get(w.code);
        if (item) (add(item, w.qty), added++);
      }
      setWaSaved(waDraft.trim().slice(0, 3000));
      setWaOpen(false);
      setWaDraft("");
      if (added) message.success(`Added ${added} item${added === 1 ? "" : "s"} from the WhatsApp order. Check the quantities, then take payment.`);
      if (missing.length) message.warning({ content: `Not found: ${missing.join(", ")}. Add them by hand.`, duration: 8 });
      focusSearch();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  async function openBills() {
    setBillsOpen(true);
    setBills(null);
    try {
      setBills(await api("/api/pos/orders"));
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const total = priced?.total ?? 0;
  const change = received !== null && received * 100 > total ? Math.round(received * 100) - total : 0;
  const searching = query.trim().length > 0;
  const columns: TableColumnsType<CartLine> = [
    {
      title: "Item",
      key: "item",
      render: (_: unknown, c) => {
        const p = priced?.lines.find((l) => l.variantId === c.variantId);
        return (
          <div>
            <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{c.name}</div>
            {p?.offerLabel_en && <Tag color="success" style={{ marginTop: 4 }}>{p.offerLabel_en}{p.freeUnits > 0 ? ` · ${p.freeUnits} free (−${inr(p.discount)})` : ""}</Tag>}
            {p?.nudge && <Tag color="gold" style={{ marginTop: 4, color: token.colorText }}>{p.nudge.label_en}</Tag>}
            {priced?.stockLimits && p && c.qty > p.stockOnHand && p.stockOnHand >= 0 && <Typography.Text type="danger" style={{ display: "block", fontSize: 12 }}>Only {p.stockOnHand} in stock</Typography.Text>}
          </div>
        );
      },
    },
    { title: "Qty", key: "qty", width: 92, render: (_: unknown, c) => <InputNumber min={1} max={100000} value={c.qty} onChange={(v) => setQty(c.variantId, v ?? 1)} style={{ width: 72 }} aria-label={`Quantity of ${c.name}`} /> },
    { title: "Amount", key: "amt", align: "right", width: 84, render: (_: unknown, c) => <Typography.Text strong>{priced ? inr(priced.lines.find((l) => l.variantId === c.variantId)?.lineTotal ?? 0) : "…"}</Typography.Text> },
    { title: "", key: "rm", width: 48, render: (_: unknown, c) => <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setQty(c.variantId, 0)} aria-label={`Remove ${c.name}`} /> },
  ];

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header style={{ background: BRAND.navy }}>
        <Flex className="mx-auto w-full max-w-[1400px] px-4 py-3" align="center" gap={12} justify="space-between">
          <Wordmark size={24} />
          <Flex gap={8} align="center">
            <ThemeToggle />
            <Button icon={<FileTextOutlined />} onClick={openBills}>Today&apos;s bills</Button>
            <Link href="/admin"><Button>Admin</Button></Link>
          </Flex>
        </Flex>
      </header>

      <div className="mx-auto w-full max-w-[1400px] flex-1 p-4">
      <Row gutter={[16, 16]}>
        {/* left: find items */}
        <Col xs={24} lg={11}>
          <Flex vertical gap={12}>
            <Typography.Title level={3} style={{ margin: 0 }}>Billing</Typography.Title>
            <Input
              ref={searchRef}
              size="large"
              autoFocus
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Type to find: dom hb, bp-04, 5*bp-04"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              aria-label="Search items"
            />
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              <kbd>↑</kbd> <kbd>↓</kbd> choose · <kbd>Enter</kbd> add · <kbd>5*code</kbd> add 5 · <kbd>F2</kbd> search · <kbd>F8</kbd> cash · <kbd>F9</kbd> UPI
            </Typography.Text>

            <Button icon={<WhatsAppOutlined />} onClick={() => setWaOpen(true)} style={{ alignSelf: "flex-start" }}>Paste WhatsApp order</Button>
            {waSaved && <Tag color="success" style={{ alignSelf: "flex-start", marginInlineEnd: 0 }}>This bill is from a WhatsApp order</Tag>}

            {searching ? (
              <SimpleList
                bordered
                dataSource={results}
                getKey={(i) => i.variantId}
                emptyText="No match. Try fewer letters or the item code."
                itemProps={(i, idx) => ({
                  onClick: () => (add(i), setQuery(""), focusSearch()),
                  style: { cursor: "pointer", background: idx === hi ? token.colorPrimaryBg : undefined },
                })}
                renderItem={(i) => (
                  <Flex justify="space-between" align="center" gap={12}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{itemTitle(i)} {i.shortCode && <Typography.Text type="secondary" style={{ fontSize: 12 }}>[{i.shortCode.toUpperCase()}]</Typography.Text>}</div>
                      <Typography.Text type={i.stockOnHand <= 0 ? "danger" : "secondary"} style={{ fontSize: 12 }}>stock {i.stockOnHand}</Typography.Text>
                    </div>
                    <Typography.Text strong>{inr(i.sellPrice)}</Typography.Text>
                  </Flex>
                )}
              />
            ) : (
              <>
                <Typography.Text strong type="secondary">Quick items</Typography.Text>
                <Row gutter={[8, 8]}>
                  {quick.map((i) => (
                    <Col key={i.variantId} xs={12} sm={8}>
                      <Card size="small" hoverable onClick={() => (add(i), focusSearch())} styles={{ body: { padding: 12 } }} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && add(i)}>
                        <div style={{ fontWeight: 600, lineHeight: 1.25, minHeight: 38 }}>{itemTitle(i)}</div>
                        <div style={{ fontWeight: 800, marginTop: 4 }}>{inr(i.sellPrice)}</div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Flex>
        </Col>

        {/* right: cart + payment */}
        <Col xs={24} lg={13}>
          <Flex vertical gap={12}>
            <Card styles={{ body: { padding: 0 } }}>
              <Table<CartLine>
                rowKey="variantId"
                size="small"
                pagination={false}
                columns={columns}
                dataSource={cart}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Cart is empty. Search or tap an item." /> }}
              />
            </Card>

            <Card>
              <Flex vertical gap={10}>
                <Flex justify="space-between"><Typography.Text type="secondary">Subtotal</Typography.Text><Typography.Text type="secondary">{inr(priced?.subtotal ?? 0)}</Typography.Text></Flex>
                {!!priced?.discount && <Flex justify="space-between"><Typography.Text type="success" strong>Offers applied</Typography.Text><Typography.Text type="success" strong>−{inr(priced.discount)}</Typography.Text></Flex>}
                <Flex justify="space-between" align="baseline">
                  <Typography.Title level={3} style={{ margin: 0 }}>Total</Typography.Title>
                  <Typography.Title level={2} style={{ margin: 0 }}>{inr(total)}</Typography.Title>
                </Flex>

                <Row gutter={8}>
                  <Col span={12}>
                    <Button type="primary" size="large" block icon={<WalletOutlined />} disabled={!priced} loading={busy} onClick={() => pay("cash")} style={{ height: 56, fontSize: 17 }}>
                      Cash <kbd style={{ marginInlineStart: 6, color: "inherit" }}>F8</kbd>
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button type="primary" size="large" block icon={<QrcodeOutlined />} disabled={!priced} loading={busy} onClick={() => pay("upi")} style={{ height: 56, fontSize: 17 }}>
                      UPI <kbd style={{ marginInlineStart: 6, color: "inherit" }}>F9</kbd>
                    </Button>
                  </Col>
                </Row>

                <Flex gap={12} align="flex-end">
                  <div className="flex-1">
                    <label htmlFor="recv" style={{ fontSize: 13, color: token.colorTextSecondary }}>Cash received (shows change)</label>
                    <InputNumber id="recv" prefix="₹" min={0} value={received} onChange={setReceived} style={{ width: "100%" }} />
                  </div>
                  {change > 0 && <Statistic title="Change" value={change / 100} prefix="₹" precision={change % 100 ? 2 : 0} />}
                </Flex>
                <Button danger icon={<CloseOutlined />} disabled={!cart.length || busy} onClick={clear}>Clear bill</Button>
              </Flex>
            </Card>
          </Flex>
        </Col>
      </Row>
      </div>

      <Modal
        open={waOpen}
        title="Paste the customer's WhatsApp order"
        okText="Add to bill"
        cancelText="Cancel"
        onOk={pasteOrder}
        onCancel={() => setWaOpen(false)}
        okButtonProps={{ disabled: !waDraft.trim() }}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">Copy the message the customer sent on WhatsApp and paste it here. Items are found by their codes (like BP-02). The message is saved with the bill.</Typography.Paragraph>
        <Input.TextArea value={waDraft} onChange={(e) => setWaDraft(e.target.value)} rows={10} autoFocus aria-label="WhatsApp order text" placeholder={"1. [BP-04] Ball Pen (Standard) Blue x 5 = ₹25\n2. [REG-01] Register ₹20 x 7 (1 free) = ₹120"} />
      </Modal>

      <Drawer open={billsOpen} onClose={() => setBillsOpen(false)} title="Today's bills" size={640} destroyOnHidden>
        {bills && (
          <Flex gap={24} wrap className="mb-4">
            <Statistic title="Bills" value={bills.summary.bills} />
            <Statistic title="Total" value={bills.summary.total / 100} prefix="₹" />
            <Statistic title="Cash" value={bills.summary.cash / 100} prefix="₹" />
            <Statistic title="UPI" value={bills.summary.upi / 100} prefix="₹" />
          </Flex>
        )}
        <BillsTable bills={bills?.bills ?? []} loading={!bills} />
      </Drawer>
    </div>
  );
}
