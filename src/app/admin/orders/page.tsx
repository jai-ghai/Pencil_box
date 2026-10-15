"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, DatePicker, Flex, InputNumber, Popconfirm, Statistic, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { BillsTable, type Bill } from "@/components/bills-table";
import { EditBillModal } from "@/components/edit-bill-modal";
import { api } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";

interface Day {
  date: string;
  summary: { bills: number; total: number; cash: number; upi: number; discount: number };
  bills: Bill[];
}

/** End-of-day check: type what is in the drawer and what the UPI app shows; the difference to the bills is shown. Nothing is saved. */
function DailyClose({ cash, upi }: { cash?: number; upi?: number }) {
  const [counted, setCounted] = useState<number | null>(null);
  const [received, setReceived] = useState<number | null>(null);
  const row = (label: string, expected: number | undefined, value: number | null, set: (v: number | null) => void) => {
    const diff = value === null || expected === undefined ? null : Math.round(value * 100) - expected;
    return (
      <Flex gap={12} align="center" wrap>
        <div style={{ minWidth: 150 }}>
          <div>{label} in bills</div>
          <Typography.Text strong>₹{expected === undefined ? "…" : expected / 100}</Typography.Text>
        </div>
        <InputNumber aria-label={`${label} actually counted`} placeholder={`${label} counted`} prefix="₹" min={0} value={value} onChange={set} style={{ width: 170 }} />
        {diff !== null && (diff === 0 ? <Tag color="success">Matches</Tag> : <Tag color={diff < 0 ? "error" : "warning"}>{diff < 0 ? `Short ₹${-diff / 100}` : `Extra ₹${diff / 100}`}</Tag>)}
      </Flex>
    );
  };
  return (
    <Card size="small" title="Daily close">
      <Flex gap={24} wrap>
        {row("Cash", cash, counted, setCounted)}
        {row("UPI", upi, received, setReceived)}
      </Flex>
    </Card>
  );
}

export default function OrdersPage() {
  const { message } = App.useApp();
  const me = useMe();
  const [day, setDay] = useState<Dayjs | null>(null); // null means today
  const [data, setData] = useState<Day | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Bill | null>(null);
  const date = day?.format("YYYY-MM-DD");
  const url = `/api/pos/orders${date ? `?date=${date}` : ""}`;

  const reload = useCallback(async () => setData(await api<Day>(url)), [url]);
  useEffect(() => {
    let live = true;
    api<Day>(url)
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [url]);

  async function remove(b: Bill) {
    try {
      await api(`/api/admin/bills/${b.id}`, { method: "DELETE" });
      message.success(`Bill #${b.billNo} deleted and its items are back in stock`);
      await reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const canEdit = can(me, "orders:edit");
  const canDelete = can(me, "orders:delete");

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>Orders</Typography.Title>
        <DatePicker value={day ?? dayjs()} onChange={(d) => (setData(null), setDay(d))} allowClear={false} disabledDate={(d) => d.isAfter(dayjs(), "day")} aria-label="Choose a day" />
      </Flex>
      <Typography.Text type="secondary">Every bill made on the billing screen is saved here as the order record.{(canEdit || canDelete) && " Open a bill to edit or delete it."}</Typography.Text>
      {err && <Alert type="error" showIcon title={err} />}
      <Flex gap={12} wrap>
        {[["Bills", data?.summary.bills, false], ["Total", data && data.summary.total / 100, true], ["Cash", data && data.summary.cash / 100, true], ["UPI", data && data.summary.upi / 100, true], ["Offers given", data && data.summary.discount / 100, true]].map(([t, v, money]) => (
          <Card key={String(t)} size="small" style={{ minWidth: 130 }}><Statistic title={String(t)} value={typeof v === "number" ? v : "…"} prefix={money ? "₹" : undefined} /></Card>
        ))}
      </Flex>
      <DailyClose key={date ?? "today"} cash={data?.summary.cash} upi={data?.summary.upi} />
      <Card styles={{ body: { padding: 0 } }}>
        <BillsTable
          bills={data?.bills ?? []}
          loading={!data && !err}
          actions={
            canEdit || canDelete
              ? (b) => (
                  <Flex gap={8}>
                    {canEdit && <Button icon={<EditOutlined />} onClick={() => setEditing(b)}>Edit bill</Button>}
                    {canDelete && (
                      <Popconfirm title={`Delete bill #${b.billNo}?`} description="Its items go back in stock. This cannot be undone, but a copy is kept in the activity log." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(b)}>
                        <Button danger icon={<DeleteOutlined />}>Delete bill</Button>
                      </Popconfirm>
                    )}
                  </Flex>
                )
              : undefined
          }
        />
      </Card>
      {editing && <EditBillModal key={editing.id} bill={editing} onClose={() => setEditing(null)} onSaved={() => (setEditing(null), reload())} />}
    </div>
  );
}
