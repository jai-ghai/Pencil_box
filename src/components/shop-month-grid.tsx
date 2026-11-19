"use client";

/**
 * Used by src/app/admin/calendar/page.tsx (replaces Ant Design Calendar).
 * No prior ShopMonthGrid existed — search confirmed empty.
 * Props only (no DB): marks[{ id, date:YYYY-MM-DD, title, color }], cursor/selected Dayjs/string.
 */
import { useMemo, type CSSProperties } from "react";
import { Button, Flex, Typography, theme } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { BRAND } from "@/lib/theme";

export interface MonthMark {
  id: string;
  date: string;
  title: string;
  color: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function monthCells(cursor: Dayjs): Dayjs[] {
  const start = cursor.startOf("month");
  const lead = (start.day() + 6) % 7; // Monday-first
  const first = start.subtract(lead, "day");
  return Array.from({ length: 42 }, (_, i) => first.add(i, "day"));
}

/**
 * Lightweight shop month grid — no Ant Design Calendar.
 * Page scrolls normally; cells never nest-scroll.
 */
export function ShopMonthGrid({
  cursor,
  selected,
  today,
  marks,
  showTitles,
  onSelect,
  onMonthChange,
}: {
  cursor: Dayjs;
  selected: string;
  today: string;
  marks: MonthMark[];
  showTitles: boolean;
  onSelect: (date: string) => void;
  onMonthChange: (month: Dayjs) => void;
}) {
  const { token } = theme.useToken();
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const byDate = useMemo(() => {
    const m = new Map<string, MonthMark[]>();
    for (const e of marks) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [marks]);

  return (
    <div className="pb-month">
      <Flex justify="space-between" align="center" gap={8} className="pb-month-nav">
        <Button type="text" icon={<LeftOutlined />} aria-label="Previous month" onClick={() => onMonthChange(cursor.subtract(1, "month"))} />
        <Flex vertical align="center" gap={0} className="min-w-0 flex-1">
          <Typography.Text strong className="tabular-nums" style={{ fontSize: 17, textWrap: "balance" }}>
            {cursor.format("MMMM YYYY")}
          </Typography.Text>
          {cursor.format("YYYY-MM") !== today.slice(0, 7) && (
            <Button type="link" size="small" onClick={() => onMonthChange(dayjs(today))} style={{ height: 22, padding: 0 }}>
              Jump to today
            </Button>
          )}
        </Flex>
        <Button type="text" icon={<RightOutlined />} aria-label="Next month" onClick={() => onMonthChange(cursor.add(1, "month"))} />
      </Flex>

      <div className="pb-month-weekdays" style={{ color: token.colorTextSecondary }} role="row">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-month-weekday" role="columnheader">
            {d}
          </div>
        ))}
      </div>

      <div className="pb-month-grid" role="grid" aria-label={`${cursor.format("MMMM YYYY")} calendar`}>
        {cells.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const inMonth = d.month() === cursor.month();
          const isToday = key === today;
          const isSelected = key === selected;
          const list = byDate.get(key) ?? [];
          const colors = [...new Set(list.map((e) => e.color))];
          const style = {
            "--pb-day-border": token.colorBorderSecondary,
            "--pb-day-muted": token.colorTextQuaternary ?? token.colorTextSecondary,
            "--pb-day-text": token.colorText,
            "--pb-day-fill": token.colorFillSecondary,
            "--pb-day-accent": BRAND.navy,
            "--pb-day-accent-soft": `${BRAND.navy}14`,
          } as CSSProperties;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${d.format("dddd, D MMMM")}${list.length ? `, ${list.length} events` : ""}`}
              className={["pb-month-day", inMonth ? "is-in" : "is-out", isToday ? "is-today" : "", isSelected ? "is-selected" : "", list.length ? "has-events" : ""]
                .filter(Boolean)
                .join(" ")}
              style={style}
              onClick={() => {
                onSelect(key);
                if (!inMonth) onMonthChange(d.startOf("month"));
              }}
            >
              <span className="pb-month-num tabular-nums">{d.date()}</span>
              {list.length > 0 && (
                <span className="pb-month-marks">
                  {showTitles ? (
                    <>
                      {list.slice(0, 2).map((e) => (
                        <span key={e.id} className="pb-month-chip" style={{ background: `${e.color}22`, color: e.color, borderColor: `${e.color}44` }} title={e.title}>
                          {e.title}
                        </span>
                      ))}
                      {list.length > 2 && <span className="pb-month-more">+{list.length - 2}</span>}
                    </>
                  ) : (
                    <span className="pb-month-dots">
                      {colors.slice(0, 4).map((c) => (
                        <span key={c} className="pb-month-dot" style={{ background: c }} />
                      ))}
                      {list.length > 1 && <span className="pb-month-count">{list.length}</span>}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
