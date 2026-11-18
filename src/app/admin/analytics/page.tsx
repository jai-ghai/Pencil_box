"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Col, Empty, Flex, Input, InputNumber, Modal, Row, Segmented, Skeleton, Statistic, Table, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, EditOutlined } from "@ant-design/icons";
import { BarList } from "@/components/bar-list";
import { SalesChart } from "@/components/sales-chart";
import { api, inr } from "@/lib/client";
import type { Analytics, Slice } from "@/lib/daybook";
import { addDays, istDate, mondayOf, monthOf, type Group } from "@/lib/reports";

type Preset = "week" | "last7" | "month" | "lastMonth" | "last30" | "custom";
interface Margin { pct: number; source: "set" | "catalogue" | "default"; catalogue: number | null; set: number | null }
type Data = Analytics & { margin: Margin };

const PRESETS: { value: Preset; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last30", label: "Last 30 days" },
  { value: "custom", label: "Pick dates" },
];

function rangeFor(p: Preset, custom: [string, string]): { from: string; to: string; group: Group } {
  const today = istDate(new Date());
  switch (p) {
    case "week": return { from: mondayOf(today), to: today, group: "day" };
    case "last7": return { from: addDays(today, -6), to: today, group: "day" };
    case "month": return { from: `${monthOf(today)}-01`, to: today, group: "day" };
    case "lastMonth": {
      const end = addDays(`${monthOf(today)}-01`, -1);
      return { from: `${monthOf(end)}-01`, to: end, group: "day" };
    }
    case "last30": return { from: addDays(today, -29), to: today, group: "day" };
    default: {
      const days = (Date.parse(custom[1]) - Date.parse(custom[0])) / 86_400_000;
      return { from: custom[0], to: custom[1], group: days > 120 ? "month" : days > 45 ? "week" : "day" };
    }
  }
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" });
const rupees = (paise: number) => paise / 100;
const prec = (paise: number) => (paise % 100 ? 2 : 0);
const MARGIN_NOTE = { set: "your own figure", catalogue: "average of your item prices", default: "a starting guess, add cost prices or set your own" } as const;

export default function ProfitPage() {
  const today = istDate(new Date());
  const { message } = App.useApp();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState<[string, string]>([addDays(today, -29), today]);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [marginOpen, setMarginOpen] = useState(false);
  const [reload, setReload] = useState(0);

  const { from, to, group } = useMemo(() => rangeFor(preset, custom), [preset, custom]);
  const [groupOverride, setGroupOverride] = useState<Group | null>(null);
  const g = groupOverride ?? group;

  useEffect(() => {
    let live = true;
    api<Data>(`/api/admin/analytics?from=${from}&to=${to}&group=${g}`)
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [from, to, g, reload]);

  function choose(p: Preset) {
    setData(null);
    setGroupOverride(null);
    setPreset(p);
  }

  const t = data?.totals;
  const change = data?.salesChangePct;
  const columns: TableColumnsType<Slice> = [
    { title: g === "day" ? "Day" : g === "week" ? "Week" : "Month", dataIndex: "label" },
    { title: "Sales", dataIndex: "sales", align: "right", render: (n: number) => inr(n) },
    { title: "Bought stock", dataIndex: "buying", align: "right", render: (n: number) => inr(n) },
    { title: "Expenses", dataIndex: "expenses", align: "right", render: (n: number) => inr(n) },
    { title: "Est. profit", dataIndex: "estProfit", align: "right", render: (n: number) => <Typography.Text strong type={n < 0 ? "danger" : undefined}>{inr(n)}</Typography.Text> },
    { title: "Cash left", dataIndex: "cashLeft", align: "right", render: (n: number) => <Typography.Text type={n < 0 ? "danger" : undefined}>{inr(n)}</Typography.Text> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Profit and sales</Typography.Title>

      <Flex gap={12} wrap align="center">
        <div className="pb-scroll-x max-w-full"><Segmented<Preset> value={preset} onChange={choose} options={PRESETS} aria-label="Period" /></div>
        {preset === "custom" && (
          <Flex gap={8} align="center">
            <Input type="date" aria-label="From" value={custom[0]} max={custom[1]} onChange={(e) => e.target.value && (setData(null), setCustom([e.target.value, custom[1]]))} style={{ width: 160 }} />
            <span>to</span>
            <Input type="date" aria-label="To" value={custom[1]} min={custom[0]} max={today} onChange={(e) => e.target.value && (setData(null), setCustom([custom[0], e.target.value]))} style={{ width: 160 }} />
          </Flex>
        )}
        <Segmented<Group> value={g} onChange={(v) => (setData(null), setGroupOverride(v))} options={[{ value: "day", label: "By day" }, { value: "week", label: "By week" }, { value: "month", label: "By month" }]} aria-label="Group by" />
      </Flex>

      {err && <Alert type="error" showIcon title={err} />}
      {!data && !err && <Skeleton active paragraph={{ rows: 10 }} />}

      {data && t && (
        <>
          <Typography.Text type="secondary">{dayLabel(data.range.from)} to {dayLabel(data.range.to)} (India time)</Typography.Text>

          {t.missingDays.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title={`${t.missingDays.length} day${t.missingDays.length === 1 ? "" : "s"} in this period ${t.missingDays.length === 1 ? "has" : "have"} no sales figure`}
              description={<>Totals are lower than real until these are filled in: {t.missingDays.slice(0, 6).map(dayLabel).join(", ")}{t.missingDays.length > 6 && ` and ${t.missingDays.length - 6} more`}. <Link href="/admin/daybook">Open the Daily book</Link></>}
            />
          )}
          {t.daysWithSales === 0 && <Alert type="info" showIcon title="No sales entered for this period yet" description={<>Type the total for each day in the <Link href="/admin/daybook">Daily book</Link> and this page fills in.</>} />}

          <Row gutter={[12, 12]}>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Statistic title="Sales" value={rupees(t.sales)} prefix="₹" precision={prec(t.sales)} />
                {change !== null && change !== undefined ? (
                  <Typography.Text type={change >= 0 ? "success" : "danger"}>
                    {change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(change)}% <span style={{ opacity: 0.75 }}>vs previous period</span>
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">No earlier period to compare</Typography.Text>
                )}
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Tooltip title={`Sales × ${data.margin.pct}% margin − expenses`}>
                  <Statistic title="Estimated profit" value={rupees(t.estProfit)} prefix="₹" precision={prec(t.estProfit)} styles={{ content: { color: t.estProfit < 0 ? "#b42318" : undefined } }} />
                </Tooltip>
                <Typography.Text type="secondary">at {data.margin.pct}% margin</Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Statistic title="Average per selling day" value={rupees(t.avgDaily)} prefix="₹" precision={prec(t.avgDaily)} />
                <Typography.Text type="secondary">{t.daysWithSales} day{t.daysWithSales === 1 ? "" : "s"} with sales</Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={8}><Card className="h-full"><Statistic title="Bought stock" value={rupees(t.buying)} prefix="₹" precision={prec(t.buying)} /><Typography.Text type="secondary">goes on the shelf, not a loss yet</Typography.Text></Card></Col>
            <Col xs={12} md={8}><Card className="h-full"><Statistic title="Expenses" value={rupees(t.expenses)} prefix="₹" precision={prec(t.expenses)} /><Typography.Text type="secondary">rent, power, pay</Typography.Text></Card></Col>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Tooltip title="Sales − bought stock − expenses. Drops in a week you stock up heavily."><Statistic title="Cash left" value={rupees(t.cashLeft)} prefix="₹" precision={prec(t.cashLeft)} styles={{ content: { color: t.cashLeft < 0 ? "#b42318" : undefined } }} /></Tooltip>
                <Typography.Text type="secondary">cash view of the period</Typography.Text>
              </Card>
            </Col>
          </Row>

          <Card size="small">
            <Flex justify="space-between" align="center" gap={12} wrap>
              <Typography.Text>Profit is estimated with a <strong>{data.margin.pct}%</strong> margin ({MARGIN_NOTE[data.margin.source]}).</Typography.Text>
              <Button icon={<EditOutlined />} onClick={() => setMarginOpen(true)}>Change margin</Button>
            </Flex>
          </Card>

          <Card title="Sales and estimated profit">
            {data.series.length ? <SalesChart series={data.series.map((s) => ({ label: s.label, revenue: s.sales, profit: s.estProfit }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing in this period" />}
          </Card>

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <Card title="Weekday pattern (average sales)" className="h-full">
                <BarList rows={data.weekdays.map((w) => ({ label: w.name, value: w.avg, note: w.days ? `${w.days} day${w.days === 1 ? "" : "s"}` : "no data" }))} format={inr} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Best and slowest day" className="h-full">
                {data.bestDay ? (
                  <Flex vertical gap={12}>
                    <div><Typography.Text type="secondary">Best day</Typography.Text><div className="text-lg font-semibold">{dayLabel(data.bestDay.date)} · {inr(data.bestDay.sales)}</div></div>
                    {data.slowestDay && <div><Typography.Text type="secondary">Slowest day</Typography.Text><div className="text-lg font-semibold">{dayLabel(data.slowestDay.date)} · {inr(data.slowestDay.sales)}</div></div>}
                    {data.source.bills > 0 && <Typography.Text type="secondary">{data.source.entered} day{data.source.entered === 1 ? "" : "s"} from typed totals, {data.source.bills} from billing-screen bills.</Typography.Text>}
                  </Flex>
                ) : (
                  <Typography.Text type="secondary">No sales in this period.</Typography.Text>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Where the buying went" className="h-full"><BarList rows={data.buyingByParty.map((b) => ({ label: b.party, value: b.amount }))} format={inr} empty="No stock bought in this period" /></Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Expenses" className="h-full"><BarList rows={data.expensesByParty.map((b) => ({ label: b.party, value: b.amount }))} format={inr} empty="No expenses in this period" /></Card>
            </Col>
          </Row>

          <Card title={g === "day" ? "Day by day" : g === "week" ? "Week by week" : "Month by month"} styles={{ body: { padding: 0 } }}>
            <Table<Slice> rowKey="key" size="small" columns={columns} dataSource={[...data.series].reverse()} pagination={data.series.length > 15 ? { pageSize: 15, showSizeChanger: false } : false} scroll={{ x: "max-content" }} locale={{ emptyText: "Nothing in this period" }} />
          </Card>
        </>
      )}

      {data && <MarginModal open={marginOpen} margin={data.margin} onClose={() => setMarginOpen(false)} onSaved={() => (message.success("Margin saved"), setMarginOpen(false), setData(null), setReload((n) => n + 1))} />}
    </div>
  );
}

function MarginModal({ open, margin, onClose, onSaved }: { open: boolean; margin: Margin; onClose: () => void; onSaved: () => void }) {
  return (
    <Modal open={open} title="Profit margin" onCancel={onClose} destroyOnHidden footer={null}>
      <MarginForm margin={margin} onSaved={onSaved} />
    </Modal>
  );
}

/** Mounted fresh each time the dialog opens, so it always starts from the current margin. */
function MarginForm({ margin, onSaved }: { margin: Margin; onSaved: () => void }) {
  const { message } = App.useApp();
  const [v, setV] = useState<number | null>(margin.pct);
  const [busy, setBusy] = useState(false);

  async function save(value: number | null) {
    setBusy(true);
    try {
      await api("/api/admin/analytics", { method: "PUT", body: { marginPct: value } });
      onSaved();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Flex vertical gap={12}>
        <Typography.Paragraph style={{ margin: 0 }}>
          Without a bill for every sale, profit is estimated: <strong>sales × margin − expenses</strong>. Margin is the share of the selling price you keep after paying the wholesaler. {margin.catalogue !== null ? `Your item prices work out to ${margin.catalogue}%.` : "Add cost prices to your items to get an automatic figure."}
        </Typography.Paragraph>
        <label htmlFor="margin-pct" className="text-sm font-semibold">Margin %</label>
        <InputNumber id="margin-pct" min={0} max={100} step={0.5} suffix="%" value={v} onChange={setV} style={{ width: 160 }} size="large" />
        <Flex gap={8} justify="flex-end" wrap>
          {margin.source === "set" && <Button loading={busy} onClick={() => save(null)}>Use automatic</Button>}
          <Button type="primary" loading={busy} disabled={v === null} onClick={() => v !== null && save(v)}>Save</Button>
        </Flex>
      </Flex>
    </>
  );
}
