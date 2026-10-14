"use client";

import { useEffect, useState } from "react";
import { Alert, Card, DatePicker, Flex, Statistic, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { BillsTable, type Bill } from "@/components/bills-table";
import { api } from "@/lib/client";

interface Day {
  date: string;
  summary: { bills: number; total: number; cash: number; upi: number; discount: number };
  bills: Bill[];
}

export default function OrdersPage() {
  const [day, setDay] = useState<Dayjs | null>(null); // null means today
  const [data, setData] = useState<Day | null>(null);
  const [err, setErr] = useState("");
  const date = day?.format("YYYY-MM-DD");

  useEffect(() => {
    let live = true;
    api<Day>(`/api/pos/orders${date ? `?date=${date}` : ""}`)
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [date]);

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>Orders</Typography.Title>
        <DatePicker value={day ?? dayjs()} onChange={(d) => (setData(null), setDay(d))} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} aria-label="Choose a day" />
      </Flex>
      <Typography.Text type="secondary">Every bill made on the billing screen is saved here as the order record.</Typography.Text>
      {err && <Alert type="error" showIcon title={err} />}
      <Flex gap={12} wrap>
        {[["Bills", data?.summary.bills, false], ["Total", data && data.summary.total / 100, true], ["Cash", data && data.summary.cash / 100, true], ["UPI", data && data.summary.upi / 100, true], ["Offers given", data && data.summary.discount / 100, true]].map(([t, v, money]) => (
          <Card key={String(t)} size="small" style={{ minWidth: 130 }}><Statistic title={String(t)} value={typeof v === "number" ? v : "…"} prefix={money ? "₹" : undefined} /></Card>
        ))}
      </Flex>
      <Card styles={{ body: { padding: 0 } }}>
        <BillsTable bills={data?.bills ?? []} loading={!data && !err} />
      </Card>
    </div>
  );
}
