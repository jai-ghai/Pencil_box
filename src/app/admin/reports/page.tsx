"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Empty, Flex, Row, Segmented, Skeleton, Statistic, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { SalesChart } from "@/components/sales-chart";
import { api, inr } from "@/lib/client";
import { addDays, istDate, mondayOf, monthOf, type Group, type Period, type Report } from "@/lib/reports";

type Preset = "today" | "yesterday" | "week" | "last7" | "month" | "all" | "custom";
interface Data extends Report {
  range: { from: string; to: string };
  group: Group;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "last7", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Pick dates" },
];

function rangeFor(preset: Preset, custom: [string, string]): { from?: string; to: string } {
  const today = istDate(new Date());
  switch (preset) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: addDays(today, -1), to: addDays(today, -1) };
    case "week": return { from: mondayOf(today), to: today };
    case "last7": return { from: addDays(today, -6), to: today };
    case "month": return { from: `${monthOf(today)}-01`, to: today };
    case "all": return { to: today };
    default: return { from: custom[0], to: custom[1] };
  }
}

const num = (paise: number) => paise / 100;

export default function ReportsPage() {
  const today = istDate(new Date());
  const [preset, setPreset] = useState<Preset>("week");
  const [custom, setCustom] = useState<[string, string]>([addDays(today, -29), today]);
  const [group, setGroup] = useState<Group>("day");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");

  const { from, to } = useMemo(() => rangeFor(preset, custom), [preset, custom]);

  useEffect(() => {
    let live = true;
    api<Data>(`/api/admin/reports?group=${group}${from ? `&from=${from}` : ""}&to=${to}`)
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [from, to, group]);

  function choosePreset(p: Preset) {
    setData(null);
    setPreset(p);
    setGroup(p === "all" ? "month" : "day"); // a sensible default; the Day/Week/Month switch still overrides it
  }

  const t = data?.totals;
  const periodColumns: TableColumnsType<Period> = [
    { title: data?.group === "day" ? "Day" : data?.group === "week" ? "Week" : "Month", dataIndex: "label" },
    { title: "Bills", dataIndex: "bills", align: "right" },
    { title: "Items", dataIndex: "units", align: "right" },
    { title: "Sales", dataIndex: "revenue", align: "right", render: (n: number) => inr(n) },
    { title: "Cost", dataIndex: "cost", align: "right", render: (n: number) => inr(n) },
    { title: "Profit", dataIndex: "profit", align: "right", render: (n: number) => <Typography.Text strong type={n < 0 ? "danger" : undefined}>{inr(n)}</Typography.Text> },
    { title: "Margin", key: "m", align: "right", render: (_: unknown, p) => (p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : "–") },
  ];

  function downloadCsv() {
    if (!data) return;
    const head = ["Period", "Bills", "Items", "Sales (Rs)", "Cost (Rs)", "Profit (Rs)", "Margin %"];
    const lines = data.series.map((p) => [p.key, p.bills, p.units, num(p.revenue), num(p.cost), num(p.profit), p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : ""].join(","));
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pencilbox-report-${data.range.from}-to-${data.range.to}.csv`;
    a.click();
  }

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Reports</Typography.Title>
        <Button icon={<DownloadOutlined />} disabled={!data} onClick={downloadCsv}>Download CSV</Button>
      </Flex>

      <Flex gap={12} wrap align="center">
        <div className="pb-scroll-x max-w-full"><Segmented<Preset> value={preset} onChange={choosePreset} options={PRESETS} /></div>
        {preset === "custom" && (
          <DatePicker.RangePicker
            allowClear={false}
            onChange={(v) => v?.[0] && v?.[1] && (setData(null), setCustom([v[0].format("YYYY-MM-DD"), v[1].format("YYYY-MM-DD")]))}
            disabledDate={(d) => d.format("YYYY-MM-DD") > today}
          />
        )}
        <Segmented<Group> value={group} onChange={(g) => (setData(null), setGroup(g))} options={[{ value: "day", label: "By day" }, { value: "week", label: "By week" }, { value: "month", label: "By month" }]} aria-label="Group by" />
      </Flex>
      {data && <Typography.Text type="secondary">{data.range.from} to {data.range.to} (India time)</Typography.Text>}
      {err && <Alert type="error" showIcon title={err} />}
      {!data && !err && <Skeleton active paragraph={{ rows: 8 }} />}

      {data && t && (
        <>
          {t.costMissingUnits > 0 && (
            <Alert
              type="warning"
              showIcon
              title={`${t.costMissingUnits} items sold have no cost price saved (services such as photocopy and printing, for example).`}
              description="Their profit is counted as 100%, so the totals below are higher than the real profit. Enter the cost per page or per item in Products to see the true figure."
            />
          )}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}><Card><Statistic title="Sales" value={num(t.revenue)} prefix="₹" precision={t.revenue % 100 ? 2 : 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Profit" value={num(t.profit)} prefix="₹" precision={t.profit % 100 ? 2 : 0} styles={{ content: { color: t.profit < 0 ? "#b42318" : undefined } }} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Profit margin" value={t.marginPct} suffix="%" precision={1} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Cost of items sold" value={num(t.cost)} prefix="₹" precision={t.cost % 100 ? 2 : 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Bills" value={t.bills} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Items sold" value={t.units} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Average bill" value={num(t.avgBill)} prefix="₹" precision={t.avgBill % 100 ? 2 : 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Offers given" value={num(t.discount)} prefix="₹" precision={t.discount % 100 ? 2 : 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Paid by cash" value={num(t.cash)} prefix="₹" precision={t.cash % 100 ? 2 : 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Paid by UPI" value={num(t.upi)} prefix="₹" precision={t.upi % 100 ? 2 : 0} /></Card></Col>
          </Row>

          <Card title="Sales and profit">
            {data.series.length ? <SalesChart series={data.series} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sales in this period" />}
          </Card>

          <Card title={data.group === "day" ? "Day by day" : data.group === "week" ? "Week by week" : "Month by month"} styles={{ body: { padding: 0 } }}>
            <Table<Period> rowKey="key" size="small" columns={periodColumns} dataSource={[...data.series].reverse()} pagination={data.series.length > 15 ? { pageSize: 15, showSizeChanger: false } : false} scroll={{ x: "max-content" }} locale={{ emptyText: "No sales in this period" }} />
          </Card>

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={14}>
              <Card title="Best selling items" styles={{ body: { padding: 0 } }}>
                <Table
                  rowKey="name"
                  size="small"
                  pagination={false}
                  dataSource={data.topItems}
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "No sales in this period" }}
                  columns={[
                    { title: "Item", dataIndex: "name" },
                    { title: "Sold", dataIndex: "units", align: "right" },
                    { title: "Sales", dataIndex: "revenue", align: "right", render: (n: number) => inr(n) },
                    { title: "Profit", dataIndex: "profit", align: "right", render: (n: number) => inr(n) },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="By category" styles={{ body: { padding: 0 } }}>
                <Table
                  rowKey="name"
                  size="small"
                  pagination={false}
                  dataSource={data.categories}
                  locale={{ emptyText: "No sales in this period" }}
                  columns={[
                    { title: "Category", dataIndex: "name" },
                    { title: "Sales", dataIndex: "revenue", align: "right", render: (n: number) => inr(n) },
                    { title: "Profit", dataIndex: "profit", align: "right", render: (n: number) => inr(n) },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
