"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Col, Empty, Flex, Progress, Row, Skeleton, Statistic, Table, Typography } from "antd";
import { api, inr } from "@/lib/client";
import type { CapitalSummary } from "@/lib/capital";

interface Dash {
  today: { bills: number; total: number; cash: number; upi: number; discount: number };
  lowStock: { id: string; name: string; stockOnHand: number; reorderLevel: number }[];
  products: number;
  ledgerDrift: number;
}

const rupees = (paise: number) => paise / 100;

export default function Dashboard() {
  const [d, setD] = useState<Dash | null>(null);
  const [cap, setCap] = useState<CapitalSummary | null | undefined>(undefined); // undefined = still loading; null = no access / failed quietly
  const [err, setErr] = useState("");
  useEffect(() => {
    api<Dash>("/api/admin/dashboard").then(setD).catch((e: Error) => setErr(e.message));
    // Capital is optional on the home page: if the person has no permission, just hide the card.
    api<CapitalSummary>("/api/admin/capital")
      .then(setCap)
      .catch(() => setCap(null));
  }, []);

  if (err) return <Alert type="error" showIcon title={err} />;
  if (!d) return <Skeleton active paragraph={{ rows: 6 }} />;

  const tiles = [
    { title: "Today's sales", value: rupees(d.today.total), prefix: "₹", note: `${d.today.bills} bill${d.today.bills === 1 ? "" : "s"}` },
    { title: "Cash", value: rupees(d.today.cash), prefix: "₹" },
    { title: "UPI", value: rupees(d.today.upi), prefix: "₹" },
    { title: "Offers given", value: rupees(d.today.discount), prefix: "₹" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Dashboard</Typography.Title>
      {d.products === 0 && (
        <Alert type="info" showIcon title="No products yet" description={<><Link href="/admin/products">Add your first product</Link> or <Link href="/admin/import">import a CSV</Link>.</>} />
      )}
      {d.ledgerDrift > 0 && <Alert type="error" showIcon title={`Stock check failed for ${d.ledgerDrift} item(s)`} description="The stock history does not match the shown count. Do a stock count on those items." />}
      <Row gutter={[12, 12]}>
        {tiles.map((t) => (
          <Col key={t.title} xs={12} md={6}>
            <Card className="h-full"><Statistic title={t.title} value={t.value} prefix={t.prefix} precision={t.value % 1 ? 2 : 0} />{t.note && <Typography.Text type="secondary">{t.note}</Typography.Text>}</Card>
          </Col>
        ))}
      </Row>

      {cap === undefined && <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>}
      {cap && <CapitalCard data={cap} />}

      <Card title="Order today (at or below reorder level)" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={d.lowStock}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing is low. Set a reorder level on an item to get alerts here." /> }}
          columns={[
            { title: "Item", dataIndex: "name" },
            { title: "In stock", dataIndex: "stockOnHand", align: "right", render: (n: number) => <Typography.Text type="danger" strong>{n}</Typography.Text> },
            { title: "Reorder at", dataIndex: "reorderLevel", align: "right" },
          ]}
        />
      </Card>
    </div>
  );
}

function CapitalCard({ data }: { data: CapitalSummary }) {
  const unset = data.capitalStart <= 0;
  const pct = Math.max(0, Math.min(100, data.recoveredPct ?? 0));
  return (
    <Card
      title="Since you started"
      extra={<Link href="/admin/capital"><Button type="link" style={{ padding: 0 }}>Open Capital</Button></Link>}
    >
      {unset ? (
        <Flex vertical gap={8}>
          <Typography.Text>Set the capital you put into the shop (for example ₹2,00,000) to see how much of it you have got back.</Typography.Text>
          <Link href="/admin/capital"><Button type="primary">Set capital</Button></Link>
        </Flex>
      ) : (
        <Flex vertical gap={12}>
          <Row gutter={[12, 12]}>
            <Col xs={12} md={8}><Statistic title="Capital" value={rupees(data.capitalStart)} prefix="₹" precision={data.capitalStart % 100 ? 2 : 0} /></Col>
            <Col xs={12} md={8}><Statistic title="Cash recovered" value={rupees(data.cashRecovered)} prefix="₹" precision={data.cashRecovered % 100 ? 2 : 0} styles={{ content: { color: data.cashRecovered < 0 ? "#b42318" : undefined } }} /></Col>
            <Col xs={12} md={8}><Statistic title="On the shelf" value={rupees(data.shelfValue)} prefix="₹" precision={data.shelfValue % 100 ? 2 : 0} /></Col>
          </Row>
          <div>
            <Progress percent={pct} status={pct >= 100 ? "success" : "active"} format={() => (data.recoveredPct !== null ? `${data.recoveredPct}%` : "—")} aria-label="Cash recovered against capital" />
            <Typography.Text type="secondary">
              {inr(data.cashRecovered)} of {inr(data.capitalStart)} back in cash
              {data.monthsToPayback !== null && data.monthsToPayback > 0 && ` · about ${data.monthsToPayback} month${data.monthsToPayback === 1 ? "" : "s"} to finish at this rate`}
              {data.monthsToPayback === 0 && " · capital already recovered"}
            </Typography.Text>
          </div>
          {data.deadStockValue > 0 && (
            <Typography.Text type="danger">₹{rupees(data.deadStockValue).toLocaleString("en-IN")} stuck on shelves with no sale in {data.deadStockDays} days.</Typography.Text>
          )}
        </Flex>
      )}
    </Card>
  );
}
