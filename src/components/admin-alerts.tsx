"use client";

import { useEffect, useState } from "react";
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

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

/**
 * Reminders strip under the admin top bar (festivals, bills, stock dates in the remind window).
 */
export function AdminAlerts() {
  const me = useMe();
  const [events, setEvents] = useState<AlertEvent[] | undefined>(undefined);

  useEffect(() => {
    if (!can(me, "calendar")) return;
    let live = true;
    api<{ events: AlertEvent[] }>("/api/admin/calendar/alerts")
      .then((d) => live && setEvents(d.events))
      .catch(() => live && setEvents([]));
    return () => {
      live = false;
    };
  }, [me]);

  const list = can(me, "calendar") ? events : [];
  if (!list?.length) return null;

  return (
    <div className="w-full px-3 pt-3 md:px-5">
      <div className="mx-auto w-full max-w-7xl">
        <Alert
          type="warning"
          showIcon
          title={`${list.length} reminder${list.length === 1 ? "" : "s"} for the shop`}
          description={
            <Flex vertical gap={8}>
              {list.slice(0, 5).map((e) => (
                <div key={e.id}>
                  <Typography.Text strong>
                    {dayLabel(e.date)} · {TYPE_LABEL[e.type]} · {e.title}
                  </Typography.Text>
                  {e.itemsHint && <div className="text-sm">Stock / offer: {e.itemsHint}</div>}
                  {e.note && !e.itemsHint && <div className="text-sm opacity-80">{e.note}</div>}
                </div>
              ))}
              {list.length > 5 && <Typography.Text type="secondary">+{list.length - 5} more</Typography.Text>}
              <Button size="small" href="/admin/calendar">
                Open calendar
              </Button>
            </Flex>
          }
        />
      </div>
    </div>
  );
}
