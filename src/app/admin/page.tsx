"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, Col, Empty, Row, Skeleton, Statistic, Table, Typography } from "antd";
import { api } from "@/lib/client";

interface Dash {
  today: { bills: number; total: number; cash: number; upi: number; discount: number };
  lowStock: { id: string; name: string; stockOnHand: number; reorderLevel: number }[];
  products: number;
  ledgerDrift: number;
}

const rupees = (paise: number) => paise / 100;

export default function Dashboard() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<Dash>("/api/admin/dashboard").then(setD).catch((e: Error) => setErr(e.message));
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
            <Card><Statistic title={t.title} value={t.value} prefix={t.prefix} precision={t.value % 1 ? 2 : 0} />{t.note && <Typography.Text type="secondary">{t.note}</Typography.Text>}</Card>
          </Col>
        ))}
      </Row>
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
