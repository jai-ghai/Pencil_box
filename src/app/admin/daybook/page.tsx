"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, AutoComplete, Button, Card, Col, Empty, Flex, Input, InputNumber, Popconfirm, Row, Skeleton, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { CameraOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { api, inr } from "@/lib/client";
import { addDays, istDate } from "@/lib/reports";
import { daysBetween } from "@/lib/daybook";
import { can, useMe } from "@/lib/use-me";
import { QuickAddModal, type QuickAddSeed } from "@/components/quick-add-modal";

interface OpenReq { _id: string; name: string; note?: string; phone?: string; imageUrl?: string; createdAt: string }

interface SalesRow { date: string; cash: number; upi: number; note: string; photos: string[] }
interface CostRow { id: string; date: string; kind: "purchase" | "expense"; amount: number; party: string; note: string }
interface BillRow { date: string; cash: number; upi: number; bills: number }
interface Data { range: { from: string; to: string }; sales: SalesRow[]; costs: CostRow[]; bills: BillRow[] }
interface DayLine { date: string; sales: number | null; fromBills: number | null; buying: number; expenses: number }

const toPaise = (rupees: number | null) => Math.round((rupees ?? 0) * 100);
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" });

export default function DailyBookPage() {
  const today = istDate(new Date());
  const { message, modal } = App.useApp();
  const me = useMe();
  const canProducts = can(me, "products");
  const [date, setDate] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [openReqs, setOpenReqs] = useState<OpenReq[] | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [seed, setSeed] = useState<QuickAddSeed | null>(null);
  const windowFor = useCallback((d: string) => {
    const to = addDays(d, 15) > today ? today : addDays(d, 15);
    return { from: addDays(to, -30), to };
  }, [today]);
  const [win, setWin] = useState(() => windowFor(today));
  const [tick, setTick] = useState(0);

  const loadRequests = useCallback(async () => {
    if (!canProducts) {
      setOpenReqs([]);
      return;
    }
    try {
      const [r, b] = await Promise.all([
        api<{ requests: OpenReq[] }>("/api/admin/requests?open=1"),
        brands.length ? Promise.resolve(null) : api<{ brands: { name: string }[] }>("/api/admin/brands"),
      ]);
      setOpenReqs(r.requests);
      if (b) setBrands(b.brands.map((x) => x.name).filter(Boolean));
    } catch {
      setOpenReqs([]);
    }
  }, [canProducts, brands.length]);

  useEffect(() => {
    let live = true;
    api<Data>(`/api/admin/daybook?from=${win.from}&to=${win.to}`)
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [win.from, win.to, tick]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  function pick(d: string) {
    setDate(d);
    if (d < win.from || d > win.to) setWin(windowFor(d));
  }
  const reload = async () => setTick((n) => n + 1);
  const saved = data?.sales.find((s) => s.date === date);
  const bill = data?.bills.find((b) => b.date === date);
  const dayCosts = (data?.costs ?? []).filter((c) => c.date === date);
  const parties = useMemo(() => [...new Set((data?.costs ?? []).map((c) => c.party).filter(Boolean))].map((value) => ({ value })), [data]);

  async function dropRequest(r: OpenReq) {
    try {
      await api(`/api/admin/requests/${r._id}`, { method: "DELETE" });
      message.success("Dropped from the list");
      setOpenReqs((list) => list?.filter((x) => x._id !== r._id) ?? null);
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const lines: DayLine[] = useMemo(() => {
    if (!data) return [];
    return daysBetween(data.range.from, data.range.to)
      .reverse()
      .map((d) => {
        const s = data.sales.find((x) => x.date === d);
        const b = data.bills.find((x) => x.date === d);
        const c = data.costs.filter((x) => x.date === d);
        return {
          date: d,
          sales: s ? s.cash + s.upi : null,
          fromBills: b ? b.cash + b.upi : null,
          buying: c.filter((x) => x.kind === "purchase").reduce((n, x) => n + x.amount, 0),
          expenses: c.filter((x) => x.kind === "expense").reduce((n, x) => n + x.amount, 0),
        };
      });
  }, [data]);

  function removeCost(c: CostRow) {
    modal.confirm({
      title: `Delete this ${c.kind === "purchase" ? "purchase" : "expense"} of ${inr(c.amount)}?`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api(`/api/admin/daybook/${c.id}`, { method: "DELETE" });
          message.success("Deleted");
          await reload();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  }

  const columns: TableColumnsType<DayLine> = [
    { title: "Day", dataIndex: "date", render: (d: string) => <Button type="link" style={{ padding: 0 }} onClick={() => pick(d)} aria-current={d === date ? "date" : undefined}>{dayLabel(d)}</Button> },
    { title: "Sales", align: "right", render: (_: unknown, l) => (l.sales !== null ? inr(l.sales) : l.fromBills !== null ? <Typography.Text type="secondary">{inr(l.fromBills)} (bills)</Typography.Text> : "–") },
    { title: "Bought stock", dataIndex: "buying", align: "right", render: (n: number) => (n ? inr(n) : "–") },
    { title: "Expenses", dataIndex: "expenses", align: "right", render: (n: number) => (n ? inr(n) : "–") },
    {
      title: "",
      key: "s",
      render: (_: unknown, l) =>
        l.sales !== null ? <Tag color="success">Entered</Tag> : l.fromBills !== null ? <Tag color="processing">From bills</Tag> : l.date < today ? <Tag color="error">Missing</Tag> : <Tag>Today</Tag>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Daily book</Typography.Title>
        <Flex align="center" gap={8}>
          <label htmlFor="book-date" className="text-sm font-semibold">Day</label>
          <Input id="book-date" type="date" value={date} max={today} onChange={(e) => e.target.value && pick(e.target.value)} style={{ width: 170 }} />
          {date !== today && <Button onClick={() => pick(today)}>Today</Button>}
        </Flex>
      </Flex>
      {err && <Alert type="error" showIcon title={err} />}
      {!data && !err && <Skeleton active paragraph={{ rows: 8 }} />}

      {data && (
        <>
          <DayForm
            key={date}
            date={date}
            saved={saved}
            bill={bill}
            parties={parties}
            onDone={reload}
          />

          {(saved?.photos?.length ?? 0) > 0 && (
            <Card size="small" title={`Photos on ${dayLabel(date)}`}>
              <Flex gap={8} wrap>
                {saved!.photos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Day photo" width={72} height={72} style={{ objectFit: "cover", borderRadius: 8 }} />
                  </a>
                ))}
              </Flex>
            </Card>
          )}

          {canProducts && (
            <Card
              title={`Buy list${openReqs ? ` (${openReqs.length} open)` : ""}`}
              size="small"
              styles={{ body: { padding: openReqs && openReqs.length ? 0 : 16 } }}
            >
              {!openReqs ? (
                <Skeleton active paragraph={{ rows: 2 }} />
              ) : openReqs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No open requests" />
              ) : (
                openReqs.map((r) => (
                  <Flex key={r._id} align="center" justify="space-between" gap={8} wrap className="px-4 py-2" style={{ borderBottom: "1px solid rgba(128,128,128,0.18)" }}>
                    <Flex gap={10} align="center" className="min-w-0" style={{ flex: "1 1 180px" }}>
                      {r.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt="" width={48} height={48} style={{ objectFit: "cover", borderRadius: 8 }} />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold" style={{ overflowWrap: "anywhere" }}>{r.name}</div>
                        <Typography.Text type="secondary" className="text-xs">
                          {[r.note, r.phone && `Phone ${r.phone}`].filter(Boolean).join(" · ") || "No note"}
                        </Typography.Text>
                      </div>
                    </Flex>
                    <Flex gap={8} className="shrink-0">
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setSeed({ requestId: r._id, line: r.name, imageUrl: r.imageUrl ?? null })}>
                        Add to shop
                      </Button>
                      <Popconfirm title="Drop this request?" okText="Drop" okButtonProps={{ danger: true }} onConfirm={() => dropRequest(r)}>
                        <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Drop ${r.name}`} />
                      </Popconfirm>
                    </Flex>
                  </Flex>
                ))
              )}
            </Card>
          )}

          <Card title={`Money out on ${dayLabel(date)}`} size="small" styles={{ body: { padding: dayCosts.length ? 0 : 16 } }}>
            {dayCosts.length === 0 ? (
              <Typography.Text type="secondary">Nothing entered for this day yet.</Typography.Text>
            ) : (
              dayCosts.map((c) => (
                <Flex key={c.id} align="center" justify="space-between" gap={8} className="px-4 py-2" style={{ borderBottom: "1px solid rgba(128,128,128,0.18)" }}>
                  <div className="min-w-0">
                    <Tag color={c.kind === "purchase" ? "processing" : "warning"}>{c.kind === "purchase" ? "Bought stock" : "Expense"}</Tag>
                    <strong>{inr(c.amount)}</strong> {c.party && <span>· {c.party}</span>}
                    {c.note && <div className="text-xs opacity-70">{c.note}</div>}
                  </div>
                  <Button type="text" danger aria-label={`Delete ${c.kind} of ${inr(c.amount)}`} icon={<DeleteOutlined />} onClick={() => removeCost(c)} />
                </Flex>
              ))
            )}
          </Card>

          <Card title="Last 31 days" styles={{ body: { padding: 0 } }}>
            <Table<DayLine> rowKey="date" size="small" columns={columns} dataSource={lines} pagination={{ pageSize: 31, hideOnSinglePage: true, showSizeChanger: false }} scroll={{ x: "max-content" }} rowClassName={(l) => (l.date === date ? "ant-table-row-selected" : "")} />
          </Card>
        </>
      )}

      <QuickAddModal
        open={!!seed}
        brands={brands}
        seed={seed}
        onClose={() => setSeed(null)}
        onSaved={async () => {
          setSeed(null);
          await loadRequests();
        }}
      />
    </div>
  );
}

/**
 * One form for the day: cash, UPI, optional bought-stock / expense, optional photo.
 * Numbers only — no free-text parsing.
 */
function DayForm({
  date,
  saved,
  bill,
  parties,
  onDone,
}: {
  date: string;
  saved?: SalesRow;
  bill?: BillRow;
  parties: { value: string }[];
  onDone: () => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const [cash, setCash] = useState<number | null>(saved ? saved.cash / 100 : null);
  const [upi, setUpi] = useState<number | null>(saved ? saved.upi / 100 : null);
  const [buyAmount, setBuyAmount] = useState<number | null>(null);
  const [buyParty, setBuyParty] = useState("");
  const [expAmount, setExpAmount] = useState<number | null>(null);
  const [expParty, setExpParty] = useState("");
  const [note, setNote] = useState(saved?.note ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const salesTotal = toPaise(cash) + toPaise(upi);
  const hasSales = cash !== null || upi !== null;
  const hasBuy = !!buyAmount && buyAmount > 0;
  const hasExp = !!expAmount && expAmount > 0;
  const canSave = hasSales || hasBuy || hasExp || !!photoUrl;

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Upload failed");
      setPhotoUrl((data as { url: string }).url);
      message.success("Photo attached");
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!canSave) {
      message.warning("Enter cash, UPI, a purchase, an expense, or a photo");
      return;
    }
    setBusy(true);
    try {
      const costs: { kind: "purchase" | "expense"; amount: number; party?: string }[] = [];
      if (hasBuy) costs.push({ kind: "purchase", amount: toPaise(buyAmount), party: buyParty.trim() || undefined });
      if (hasExp) costs.push({ kind: "expense", amount: toPaise(expAmount), party: expParty.trim() || undefined });

      await api("/api/admin/daybook", {
        method: "POST",
        body: {
          apply: true,
          date,
          cash: hasSales ? toPaise(cash) : undefined,
          upi: hasSales ? toPaise(upi) : undefined,
          note: note.trim() || undefined,
          photo: photoUrl ?? undefined,
          costs,
        },
      });
      message.success(`Saved for ${dayLabel(date)}`);
      setBuyAmount(null);
      setBuyParty("");
      setExpAmount(null);
      setExpParty("");
      setPhotoUrl(null);
      await onDone();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function removeSales() {
    modal.confirm({
      title: `Remove the sales total for ${dayLabel(date)}?`,
      content: bill ? "The day will use its billing-screen total instead." : "The day will show as missing.",
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api(`/api/admin/daybook?date=${date}`, { method: "DELETE" });
          setCash(null);
          setUpi(null);
          await onDone();
        } catch (e) {
          message.error((e as Error).message);
        }
      },
    });
  }

  return (
    <Card title={`Add ${dayLabel(date)}`} extra={saved && <Tag color="success">Sales saved</Tag>}>
      <Flex vertical gap={16}>
        <div>
          <Typography.Text strong className="mb-2 block">What you sold</Typography.Text>
          <Row gutter={12}>
            <Col xs={12}>
              <label htmlFor="day-cash" className="mb-1 block text-sm font-semibold">Cash</label>
              <InputNumber id="day-cash" prefix="₹" min={0} max={10_000_000} controls={false} inputMode="decimal" style={{ width: "100%" }} size="large" value={cash} onChange={setCash} />
            </Col>
            <Col xs={12}>
              <label htmlFor="day-upi" className="mb-1 block text-sm font-semibold">UPI</label>
              <InputNumber id="day-upi" prefix="₹" min={0} max={10_000_000} controls={false} inputMode="decimal" style={{ width: "100%" }} size="large" value={upi} onChange={setUpi} />
            </Col>
          </Row>
          {(cash !== null || upi !== null) && (
            <Typography.Text type="secondary" className="mt-1 block">Total sales {inr(salesTotal)}</Typography.Text>
          )}
          {bill && !saved && (
            <Alert
              className="mt-2"
              type="info"
              showIcon
              title={`Billing screen: ${bill.bills} bill${bill.bills === 1 ? "" : "s"} · ${inr(bill.cash + bill.upi)}`}
              action={<Button size="small" onClick={() => { setCash(bill.cash / 100); setUpi(bill.upi / 100); }}>Use this</Button>}
            />
          )}
        </div>

        <div>
          <Typography.Text strong className="mb-2 block">Bought stock (optional)</Typography.Text>
          <Row gutter={12}>
            <Col xs={10}>
              <label htmlFor="day-buy" className="mb-1 block text-sm font-semibold">Amount</label>
              <InputNumber id="day-buy" prefix="₹" min={0} max={10_000_000} controls={false} inputMode="decimal" style={{ width: "100%" }} size="large" value={buyAmount} onChange={setBuyAmount} />
            </Col>
            <Col xs={14}>
              <label htmlFor="day-buy-party" className="mb-1 block text-sm font-semibold">Wholesaler</label>
              <AutoComplete id="day-buy-party" options={parties} value={buyParty} onChange={setBuyParty} style={{ width: "100%" }} size="large" placeholder="e.g. Balaji" filterOption={(input, o) => !!o?.value.toLowerCase().includes(input.toLowerCase())} />
            </Col>
          </Row>
        </div>

        <div>
          <Typography.Text strong className="mb-2 block">Expense (optional)</Typography.Text>
          <Row gutter={12}>
            <Col xs={10}>
              <label htmlFor="day-exp" className="mb-1 block text-sm font-semibold">Amount</label>
              <InputNumber id="day-exp" prefix="₹" min={0} max={10_000_000} controls={false} inputMode="decimal" style={{ width: "100%" }} size="large" value={expAmount} onChange={setExpAmount} />
            </Col>
            <Col xs={14}>
              <label htmlFor="day-exp-party" className="mb-1 block text-sm font-semibold">What for</label>
              <AutoComplete id="day-exp-party" options={parties} value={expParty} onChange={setExpParty} style={{ width: "100%" }} size="large" placeholder="e.g. Electricity, helper" filterOption={(input, o) => !!o?.value.toLowerCase().includes(input.toLowerCase())} />
            </Col>
          </Row>
        </div>

        <Input placeholder="Note (optional)" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />

        <Flex gap={8} wrap align="center">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden aria-hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <Button icon={<CameraOutlined />} loading={uploading} onClick={() => fileRef.current?.click()}>
            {photoUrl ? "Change photo" : "Add photo"}
          </Button>
          {photoUrl && (
            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Attached" width={48} height={48} style={{ objectFit: "cover", borderRadius: 8 }} />
            </a>
          )}
          <Flex gap={8} style={{ marginLeft: "auto" }} wrap>
            {saved && <Button danger onClick={removeSales}>Remove sales</Button>}
            <Button type="primary" size="large" loading={busy} disabled={!canSave} onClick={save}>
              Save
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
