"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Card, Col, Empty, Flex, Input, InputNumber, Modal, Progress, Row, Skeleton, Statistic, Table, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { api, inr } from "@/lib/client";
import type { CapitalSummary, DeadStockLine } from "@/lib/capital";

const rupees = (paise: number) => paise / 100;
const prec = (paise: number) => (paise % 100 ? 2 : 0);
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

export default function CapitalPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<CapitalSummary | null>(null);
  const [err, setErr] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    api<CapitalSummary>("/api/admin/capital")
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [reload]);

  const capitalUnset = !!data && data.capitalStart <= 0;
  const recoveredPct = data?.recoveredPct ?? 0;
  const booksPct = data?.booksPct ?? 0;

  const deadColumns: TableColumnsType<DeadStockLine> = [
    { title: "Item", dataIndex: "name", render: (n: string) => <span style={{ overflowWrap: "anywhere" }}>{n}</span> },
    { title: "On shelf", dataIndex: "qty", align: "right" },
    { title: "Value at cost", dataIndex: "value", align: "right", render: (n: number) => (n ? inr(n) : <Typography.Text type="secondary">no cost</Typography.Text>) },
    {
      title: "Last sold",
      dataIndex: "lastSoldDate",
      render: (d: string | null) => (d ? dayLabel(d) : <Typography.Text type="secondary">never</Typography.Text>),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Capital</Typography.Title>
        <Button icon={<EditOutlined />} onClick={() => setSettingsOpen(true)}>Change settings</Button>
      </Flex>

      {err && <Alert type="error" showIcon title={err} />}
      {!data && !err && <Skeleton active paragraph={{ rows: 10 }} />}

      {data && (
        <>
          {capitalUnset && (
            <Alert
              type="info"
              showIcon
              title="Set the capital you put into the shop"
              description={<>Type the amount you invested (for example ₹2,00,000) and, if you know it, the day you started. Then this page shows how much of that money you have got back.</>}
              action={<Button type="primary" onClick={() => setSettingsOpen(true)}>Set capital</Button>}
            />
          )}

          <Typography.Text type="secondary">
            {dayLabel(data.from)} to {dayLabel(data.to)} · {data.days} day{data.days === 1 ? "" : "s"}
            {data.startDate ? "" : " (from the first day on file)"}
          </Typography.Text>

          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} lg={8}>
              <Card className="h-full">
                <Statistic title="Capital put in" value={rupees(data.capitalStart)} prefix="₹" precision={prec(data.capitalStart)} />
                <Typography.Text type="secondary">{capitalUnset ? "not set yet" : data.startDate ? `from ${dayLabel(data.startDate)}` : "counting every day on file"}</Typography.Text>
              </Card>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Card className="h-full">
                <Tooltip title="Sales − stock bought − expenses. The money that has actually come back to you.">
                  <Statistic title="Cash recovered" value={rupees(data.cashRecovered)} prefix="₹" precision={prec(data.cashRecovered)} styles={{ content: { color: data.cashRecovered < 0 ? "#b42318" : undefined } }} />
                </Tooltip>
                {!capitalUnset && data.recoveredPct !== null && (
                  <div className="mt-2">
                    <Progress percent={Math.max(0, Math.min(100, recoveredPct))} showInfo={false} status={recoveredPct >= 100 ? "success" : "active"} aria-label="Cash recovered against capital" />
                    <Typography.Text type="secondary">{data.recoveredPct}% of capital back in cash</Typography.Text>
                  </div>
                )}
              </Card>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <Card className="h-full">
                <Tooltip title="Cash recovered + what is still on the shelf (at your cost prices) − capital. Positive means the shop is ahead of the money you put in.">
                  <Statistic title="Position vs capital" value={rupees(data.position)} prefix="₹" precision={prec(data.position)} styles={{ content: { color: data.position < 0 ? "#b42318" : undefined } }} />
                </Tooltip>
                {!capitalUnset && data.booksPct !== null ? (
                  <Typography.Text type="secondary">{data.booksPct}% on the books (cash + shelf)</Typography.Text>
                ) : (
                  <Typography.Text type="secondary">set the capital to see this as a %</Typography.Text>
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={12} md={8}><Card className="h-full"><Statistic title="Sales" value={rupees(data.sales)} prefix="₹" precision={prec(data.sales)} /><Typography.Text type="secondary">typed totals + POS bills</Typography.Text></Card></Col>
            <Col xs={12} md={8}><Card className="h-full"><Statistic title="Stock bought" value={rupees(data.purchases)} prefix="₹" precision={prec(data.purchases)} /><Typography.Text type="secondary">daybook + purchase bills</Typography.Text></Card></Col>
            <Col xs={12} md={8}><Card className="h-full"><Statistic title="Expenses" value={rupees(data.expenses)} prefix="₹" precision={prec(data.expenses)} /><Typography.Text type="secondary">rent, power, pay</Typography.Text></Card></Col>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Tooltip title="sum(stock on hand × cost price) for live items">
                  <Statistic title="On the shelf (at cost)" value={rupees(data.shelfValue)} prefix="₹" precision={prec(data.shelfValue)} />
                </Tooltip>
                {data.unpricedOnShelf > 0 ? (
                  <Typography.Text type="warning">{data.unpricedOnShelf} item{data.unpricedOnShelf === 1 ? "" : "s"} have no cost price yet</Typography.Text>
                ) : (
                  <Typography.Text type="secondary">money sitting on the shelves</Typography.Text>
                )}
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Statistic title="Stuck on shelves" value={rupees(data.deadStockValue)} prefix="₹" precision={prec(data.deadStockValue)} styles={{ content: { color: data.deadStockValue > 0 ? "#b42318" : undefined } }} />
                <Typography.Text type="secondary">no sale in {data.deadStockDays} days · {data.deadStockLines.length} item{data.deadStockLines.length === 1 ? "" : "s"}</Typography.Text>
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card className="h-full">
                <Tooltip title="Cash recovered ÷ months of data so far. Used to estimate how long the rest of the capital will take.">
                  <Statistic title="Monthly net so far" value={rupees(data.monthlyNetAvg)} prefix="₹" precision={prec(data.monthlyNetAvg)} styles={{ content: { color: data.monthlyNetAvg < 0 ? "#b42318" : undefined } }} />
                </Tooltip>
                <Typography.Text type="secondary">
                  {data.monthsToPayback === 0
                    ? "capital already recovered"
                    : data.monthsToPayback === null
                      ? data.days < 30
                        ? "need ~30 days of data for a forecast"
                        : "rate is zero or negative"
                      : `about ${data.monthsToPayback} month${data.monthsToPayback === 1 ? "" : "s"} to finish recovering`}
                </Typography.Text>
              </Card>
            </Col>
          </Row>

          {!capitalUnset && (
            <Card size="small">
              <Flex vertical gap={8}>
                <Typography.Text>
                  Cash recovered is <strong>{inr(data.cashRecovered)}</strong> of <strong>{inr(data.capitalStart)}</strong>
                  {data.recoveredPct !== null && ` (${data.recoveredPct}%)`}.
                  {booksPct !== null && <> On the books (cash + shelf): <strong>{data.booksPct}%</strong>.</>}
                </Typography.Text>
                <Progress
                  percent={Math.max(0, Math.min(100, recoveredPct))}
                  status={recoveredPct >= 100 ? "success" : "active"}
                  format={() => (data.recoveredPct !== null ? `${data.recoveredPct}%` : "—")}
                  aria-label="Cash recovered against capital"
                />
              </Flex>
            </Card>
          )}

          <Alert
            type="info"
            showIcon
            title="Stock bought is counted from both places"
            description={<>The Daily book &quot;Bought stock&quot; entries and the Purchases page both count here. Enter each purchase in only one place, or the same money will be counted twice. Prefer the <Link href="/admin/purchases">Purchases</Link> page when you have a bill; use the Daily book for a quick total when you do not.</>}
          />

          <Card title={`Capital stuck on shelves (no sale in ${data.deadStockDays} days)`} styles={{ body: { padding: data.deadStockLines.length ? 0 : 16 } }}>
            {data.deadStockLines.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing has been sitting that long. Good." />
            ) : (
              <Table<DeadStockLine>
                rowKey="id"
                size="small"
                columns={deadColumns}
                dataSource={data.deadStockLines.slice(0, 50)}
                pagination={data.deadStockLines.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
                scroll={{ x: "max-content" }}
                footer={data.deadStockLines.length > 50 ? () => `Showing the top 50 of ${data.deadStockLines.length} by value` : undefined}
              />
            )}
          </Card>
        </>
      )}

      {data && (
        <SettingsModal
          open={settingsOpen}
          capitalStart={data.capitalStart}
          startDate={data.startDate}
          deadStockDays={data.deadStockDays}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            message.success("Saved");
            setSettingsOpen(false);
            setData(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function SettingsModal({
  open,
  capitalStart,
  startDate,
  deadStockDays,
  onClose,
  onSaved,
}: {
  open: boolean;
  capitalStart: number;
  startDate: string | null;
  deadStockDays: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open={open} title="Capital settings" onCancel={onClose} destroyOnHidden footer={null}>
      <SettingsForm capitalStart={capitalStart} startDate={startDate} deadStockDays={deadStockDays} onSaved={onSaved} />
    </Modal>
  );
}

/** Mounted fresh each time the dialog opens, so it always starts from the current values. */
function SettingsForm({
  capitalStart,
  startDate,
  deadStockDays,
  onSaved,
}: {
  capitalStart: number;
  startDate: string | null;
  deadStockDays: number;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const [amount, setAmount] = useState<number | null>(capitalStart > 0 ? capitalStart / 100 : null);
  const [date, setDate] = useState(startDate ?? "");
  const [days, setDays] = useState<number | null>(deadStockDays);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (amount === null || amount < 0) {
      message.error("Enter the capital amount");
      return;
    }
    if (days === null || days < 14 || days > 365) {
      message.error("Stuck-stock days must be between 14 and 365");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/capital", {
        method: "PUT",
        body: {
          capitalStart: Math.round(amount * 100),
          startDate: date || null,
          deadStockDays: days,
        },
      });
      onSaved();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Flex vertical gap={12}>
      <Typography.Paragraph style={{ margin: 0 }}>
        The capital is the total money you put into the shop. Everything else on this page is computed from the Daily book, Purchases and sales already on file.
      </Typography.Paragraph>
      <div>
        <label htmlFor="cap-amount" className="mb-1 block text-sm font-semibold">Capital put in</label>
        <InputNumber id="cap-amount" prefix="₹" min={0} max={10_000_000} step={1000} controls={false} inputMode="decimal" style={{ width: "100%" }} size="large" value={amount} onChange={setAmount} />
      </div>
      <div>
        <label htmlFor="cap-date" className="mb-1 block text-sm font-semibold">Started on (optional)</label>
        <Input id="cap-date" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} style={{ width: "100%" }} size="large" />
        <Typography.Text type="secondary" className="text-xs">Leave blank to count every day of data on file.</Typography.Text>
      </div>
      <div>
        <label htmlFor="cap-dead" className="mb-1 block text-sm font-semibold">Count stock as stuck after</label>
        <InputNumber id="cap-dead" min={14} max={365} suffix="days" style={{ width: 160 }} size="large" value={days} onChange={setDays} />
      </div>
      <Flex justify="flex-end">
        <Button type="primary" size="large" loading={busy} onClick={save}>Save</Button>
      </Flex>
    </Flex>
  );
}
