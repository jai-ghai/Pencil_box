"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Flex, Typography } from "antd";
import { api } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";
import { TYPE_LABEL, type EventType } from "@/lib/shop-calendar";

interface AlertEvent {
  id: string;
  date: string;
  title: string;
  type: EventType;
  itemsHint?: string;
  note?: string;
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" });

/**
 * Top-of-admin bar: festivals, bills and stock reminders that are due today or within their remind window.
 * Hidden when the signed-in person has no calendar permission, or when nothing is due.
 */
export function AdminAlerts() {
  const me = useMe();
  const [events, setEvents] = useState<AlertEvent[] | null>(null);

  useEffect(() => {
    if (!can(me, "calendar")) {
      setEvents([]);
      return;
    }
    let live = true;
    api<{ events: AlertEvent[] }>("/api/admin/calendar/alerts")
      .then((d) => live && setEvents(d.events))
      .catch(() => live && setEvents([]));
    return () => {
      live = false;
    };
  }, [me]);

  if (!events?.length) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-3">
      <Alert
        type="warning"
        showIcon
        title={`${events.length} reminder${events.length === 1 ? "" : "s"} for the shop`}
        description={
          <Flex vertical gap={8}>
            {events.slice(0, 5).map((e) => (
              <div key={e.id}>
                <Typography.Text strong>
                  {dayLabel(e.date)} · {TYPE_LABEL[e.type]} · {e.title}
                </Typography.Text>
                {e.itemsHint && <div className="text-sm">Stock / offer: {e.itemsHint}</div>}
                {e.note && !e.itemsHint && <div className="text-sm opacity-80">{e.note}</div>}
              </div>
            ))}
            {events.length > 5 && <Typography.Text type="secondary">+{events.length - 5} more</Typography.Text>}
            <Link href="/admin/calendar"><Button size="small">Open calendar</Button></Link>
          </Flex>
        }
      />
    </div>
  );
}
