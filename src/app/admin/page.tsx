"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Progress,
  Skeleton,
  Typography,
  theme,
} from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { api, inr } from "@/lib/client";
import type { CapitalSummary } from "@/lib/capital";
import { TYPE_LABEL, type EventType } from "@/lib/shop-calendar";
import { ADMIN_NAV_GROUPS } from "@/lib/admin-nav";
import { can, useMe } from "@/lib/use-me";
import { BRAND } from "@/lib/theme";
import { istDate } from "@/lib/reports";
import type { Perm } from "@/lib/permissions";

interface Dash {
  today: { bills: number; total: number; cash: number; upi: number; discount: number };
  lowStock: { id: string; name: string; stockOnHand: number; reorderLevel: number }[];
  products: number;
  ledgerDrift: number;
}

interface AlertEvent {
  id: string;
  date: string;
  title: string;
  type: EventType;
  itemsHint?: string;
  note?: string;
}

const rupees = (paise: number) => paise / 100;

const dayLong = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const dayShort = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

export default function Dashboard() {
  const { token } = theme.useToken();
  const me = useMe();
  const today = istDate(new Date());
  const [d, setD] = useState<Dash | null>(null);
  const [cap, setCap] = useState<CapitalSummary | null | undefined>(undefined);
  const [alerts, setAlerts] = useState<AlertEvent[] | null | undefined>(undefined);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    api<Dash>("/api/admin/dashboard")
      .then((data) => {
        if (!live) return;
        setErr("");
        setD(data);
      })
      .catch((e: Error) => live && setErr(e.message));

    if (can(me, "capital")) {
      api<CapitalSummary>("/api/admin/capital")
        .then((c) => live && setCap(c))
        .catch(() => live && setCap(null));
    }

    if (can(me, "calendar")) {
      api<{ events: AlertEvent[] }>("/api/admin/calendar/alerts")
        .then((r) => live && setAlerts(r.events))
        .catch(() => live && setAlerts([]));
    }

    return () => {
      live = false;
    };
  }, [me]);

  const alertList = can(me, "calendar") ? alerts : [];
  const capital = can(me, "capital") ? cap : null;

  if (err) return <Alert type="error" showIcon title={err} />;
  if (!d) return <Skeleton active paragraph={{ rows: 10 }} />;

  const surface = {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  } as const;

  const jumpGroups = ADMIN_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((n) => n.href !== "/admin" && n.perm !== "users" && can(me, n.perm as Perm)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero: today at the shop */}
      <section
        className="relative overflow-hidden px-5 py-6 md:px-7 md:py-8"
        style={{
          ...surface,
          background: `linear-gradient(135deg, ${BRAND.navyDeep} 0%, ${BRAND.navy} 55%, #1a3a8a 100%)`,
          border: "none",
          color: "#fff",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-20"
          style={{ background: BRAND.sun }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 right-24 h-48 w-48 rounded-full opacity-10"
          style={{ background: BRAND.sun }}
        />
        <Flex justify="space-between" align="flex-start" gap={16} wrap>
          <div className="relative z-[1] max-w-xl">
            <p className="mb-1 text-sm font-semibold tracking-wide" style={{ color: "rgba(255,213,0,0.9)" }}>
              Today at the shop
            </p>
            <h1 className="m-0 text-balance text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: "#fff", textWrap: "balance" as never }}>
              {dayLong(today)}
            </h1>
            <p className="mt-2 max-w-[42ch] text-pretty text-sm md:text-base" style={{ color: "rgba(255,255,255,0.78)" }}>
              Festivals, bills, and stock reminders first — then capital and the day&apos;s numbers.
            </p>
          </div>
          <Flex gap={8} wrap className="relative z-[1]">
            {can(me, "daybook") && (
              <Button type="primary" size="large" href="/admin/daybook" style={{ background: BRAND.sun, color: BRAND.navyDeep, border: "none" }}>
                Enter today&apos;s sale
              </Button>
            )}
            {can(me, "calendar") && (
              <Button size="large" href="/admin/calendar" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", borderColor: "rgba(255,255,255,0.28)" }}>
                Open calendar
              </Button>
            )}
          </Flex>
        </Flex>
      </section>

      {d.products === 0 && (
        <Alert
          type="info"
          showIcon
          title="No products yet"
          description={
            <>
              <Link href="/admin/products">Add your first product</Link> or <Link href="/admin/import">import a CSV</Link>.
            </>
          }
        />
      )}
      {d.ledgerDrift > 0 && (
        <Alert
          type="error"
          showIcon
          title={`Stock check failed for ${d.ledgerDrift} item(s)`}
          description="The stock history does not match the shown count. Do a stock count on those items."
        />
      )}

      {/* Attention: calendar / season */}
      <section style={surface} className="overflow-hidden">
          <Flex justify="space-between" align="center" className="border-b px-4 py-3 md:px-5" style={{ borderColor: token.colorBorderSecondary }}>
            <Typography.Title level={2} style={{ margin: 0, fontSize: 16 }}>
              Need attention
            </Typography.Title>
          {can(me, "calendar") && (
            <Link href="/admin/calendar" className="text-sm font-semibold" style={{ color: token.colorPrimary }}>
              Calendar <ArrowRightOutlined />
            </Link>
          )}
        </Flex>
        <div className="px-4 py-3 md:px-5">
          {can(me, "calendar") && alertList === undefined ? (
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          ) : !can(me, "calendar") ? (
            <Typography.Text type="secondary">Calendar permission is off for this login.</Typography.Text>
          ) : !alertList?.length ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nothing due today. Load the seasonal pack on Calendar for Diwali, back-to-school and rent reminders."
            >
              <Button type="primary" href="/admin/calendar">
                Set up calendar
              </Button>
            </Empty>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0 p-0">
              {alertList.slice(0, 6).map((e, i) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  style={{ borderTop: i === 0 ? "none" : `1px solid ${token.colorBorderSecondary}` }}
                >
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: token.colorTextSecondary }}>
                      {dayShort(e.date)} · {TYPE_LABEL[e.type]}
                    </div>
                    <div className="text-base font-semibold">{e.title}</div>
                    {e.itemsHint && (
                      <div className="text-sm" style={{ color: "#b45309" }}>
                        Stock / offer: {e.itemsHint}
                      </div>
                    )}
                    {e.note && !e.itemsHint && (
                      <div className="text-sm" style={{ color: token.colorTextSecondary }}>
                        {e.note}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Money: capital + day pulse */}
      <div className="grid gap-4 md:grid-cols-2">
        <section style={surface} className="flex flex-col overflow-hidden">
          <Flex justify="space-between" align="center" className="border-b px-4 py-3 md:px-5" style={{ borderColor: token.colorBorderSecondary }}>
            <Typography.Title level={2} style={{ margin: 0, fontSize: 16 }}>
              Capital
            </Typography.Title>
            {can(me, "capital") && (
              <Link href="/admin/capital" className="text-sm font-semibold" style={{ color: token.colorPrimary }}>
                Details <ArrowRightOutlined />
              </Link>
            )}
          </Flex>
          <div className="flex flex-1 flex-col gap-3 px-4 py-4 md:px-5">
            {!can(me, "capital") ? (
              <Typography.Text type="secondary">Capital permission is off for this login.</Typography.Text>
            ) : capital === undefined ? (
              <Skeleton active paragraph={{ rows: 3 }} title={false} />
            ) : !capital || capital.capitalStart <= 0 ? (
              <Flex vertical gap={10}>
                <Typography.Text type="secondary">
                  Set what you put into the shop to see how much cash is back versus still on the shelf.
                </Typography.Text>
                <Button type="primary" href="/admin/capital">
                  Set capital
                </Button>
              </Flex>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Cash recovered" value={inr(capital.cashRecovered)} warn={capital.cashRecovered < 0} />
                  <Metric label="On the shelf" value={inr(capital.shelfValue)} />
                </div>
                <div>
                  <Progress
                    percent={Math.max(0, Math.min(100, capital.recoveredPct ?? 0))}
                    status={(capital.recoveredPct ?? 0) >= 100 ? "success" : "active"}
                    format={() => (capital.recoveredPct !== null ? `${capital.recoveredPct}%` : "—")}
                    aria-label="Cash recovered against capital"
                  />
                  <Typography.Text type="secondary" className="text-sm">
                    {inr(capital.cashRecovered)} of {inr(capital.capitalStart)} back
                    {capital.monthsToPayback !== null && capital.monthsToPayback > 0 && ` · ~${capital.monthsToPayback} mo left at this rate`}
                    {capital.monthsToPayback === 0 && " · capital recovered"}
                  </Typography.Text>
                </div>
                {capital.deadStockValue > 0 && (
                  <Typography.Text type="danger" className="text-sm">
                    {inr(capital.deadStockValue)} stuck with no sale in {capital.deadStockDays} days.
                  </Typography.Text>
                )}
              </>
            )}
          </div>
        </section>

        <section style={surface} className="overflow-hidden">
          <Flex justify="space-between" align="center" className="border-b px-4 py-3 md:px-5" style={{ borderColor: token.colorBorderSecondary }}>
            <Typography.Title level={2} style={{ margin: 0, fontSize: 16 }}>
              Today&apos;s money
            </Typography.Title>
            {can(me, "daybook") && (
              <Link href="/admin/daybook" className="text-sm font-semibold" style={{ color: token.colorPrimary }}>
                Daily book <ArrowRightOutlined />
              </Link>
            )}
          </Flex>
          <div className="grid grid-cols-2 gap-3 px-4 py-4 md:px-5">
            <Metric label="Sales today" value={inr(d.today.total)} large />
            <Metric label="Bills / entries" value={String(d.today.bills)} />
            <Metric label="Cash" value={inr(d.today.cash)} />
            <Metric label="UPI" value={inr(d.today.upi)} />
          </div>
          {d.today.total === 0 && can(me, "daybook") && (
            <div className="border-t px-4 py-3 md:px-5" style={{ borderColor: token.colorBorderSecondary }}>
              <Typography.Text type="secondary" className="text-sm">
                No sale logged yet — open the daily book and type today&apos;s total.
              </Typography.Text>
            </div>
          )}
        </section>
      </div>

      {/* Jump to — same groups as the sidebar */}
      {jumpGroups.length > 0 && (
        <section className="flex flex-col gap-5">
          <Typography.Title level={2} style={{ margin: 0, fontSize: 16 }}>
            Jump to
          </Typography.Title>
          {jumpGroups.map((g) => (
            <div key={g.id}>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: token.colorTextSecondary }}>
                {g.label}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {g.items.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex flex-col gap-0.5 p-4 transition-transform active:scale-[0.98]"
                    style={surface}
                  >
                    <span className="font-semibold" style={{ color: token.colorText }}>
                      {a.label}
                    </span>
                    {a.hint && (
                      <span className="text-sm" style={{ color: token.colorTextSecondary }}>
                        {a.hint}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Low stock */}
      <section style={surface} className="overflow-hidden">
          <Flex justify="space-between" align="center" className="border-b px-4 py-3 md:px-5" style={{ borderColor: token.colorBorderSecondary }}>
          <Typography.Title level={2} style={{ margin: 0, fontSize: 16 }}>
            Order these
          </Typography.Title>
          {can(me, "stock") && (
            <Link href="/admin/stock" className="text-sm font-semibold" style={{ color: token.colorPrimary }}>
              Stock <ArrowRightOutlined />
            </Link>
          )}
        </Flex>
        {d.lowStock.length === 0 ? (
          <div className="px-4 py-6 md:px-5">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Nothing is low. Set a reorder level on an item to see it here."
            />
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {d.lowStock.slice(0, 12).map((row, i) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-3 md:px-5"
                style={{ borderTop: i === 0 ? "none" : `1px solid ${token.colorBorderSecondary}` }}
              >
                <span className="min-w-0 truncate font-medium">{row.name}</span>
                <span className="shrink-0 font-semibold tabular-nums" style={{ color: token.colorError }}>
                  {row.stockOnHand}
                  <span className="ml-1 font-normal" style={{ color: token.colorTextSecondary }}>
                    / {row.reorderLevel}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  large,
  warn,
}: {
  label: string;
  value: string;
  large?: boolean;
  warn?: boolean;
}) {
  const { token } = theme.useToken();
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: token.colorTextSecondary }}>
        {label}
      </div>
      <div
        className={`font-semibold tabular-nums ${large ? "text-2xl md:text-3xl" : "text-lg"}`}
        style={{ color: warn ? token.colorError : token.colorText, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
    </div>
  );
}
