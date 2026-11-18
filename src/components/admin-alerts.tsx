"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import { CloseOutlined, WarningFilled } from "@ant-design/icons";
import { api } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";
import { TYPE_LABEL, type EventType } from "@/lib/shop-calendar";
import { istDate } from "@/lib/reports";

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

const dismissKey = (username: string) => `pb_admin_alerts_dismiss:${username}`;

/** sessionStorage: hide today's strip until this browser session ends, or until the India-date rolls over. */
function readDismissed(username: string, today: string): boolean {
  try {
    const raw = sessionStorage.getItem(dismissKey(username));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { day?: string };
    return parsed.day === today;
  } catch {
    return false;
  }
}

function writeDismissed(username: string, today: string) {
  try {
    sessionStorage.setItem(dismissKey(username), JSON.stringify({ day: today }));
  } catch {
    /* private mode */
  }
}

/** Clear on sign-out so the next login can see today's reminders again. */
export function clearAdminAlertDismiss(username?: string) {
  try {
    if (username) sessionStorage.removeItem(dismissKey(username));
    else {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k?.startsWith("pb_admin_alerts_dismiss:")) sessionStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Compact one-line shop reminders under the admin top bar.
 * Cross hides for this login session today; tomorrow (or after re-login) they come back.
 */
export function AdminAlerts() {
  const me = useMe();
  const today = istDate(new Date());
  const [events, setEvents] = useState<AlertEvent[] | undefined>(undefined);
  const [, bump] = useState(0);

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
  const dismissed = !!me && readDismissed(me.username, today);
  // bump is only to re-read sessionStorage after dismiss
  void bump;

  if (dismissed || !list?.length) return null;

  const first = list[0];
  const more = list.length - 1;
  const preview = `${dayLabel(first.date)} · ${TYPE_LABEL[first.type]} · ${first.title}${first.itemsHint ? ` — ${first.itemsHint}` : ""}`;

  function dismiss() {
    if (!me) return;
    writeDismissed(me.username, today);
    bump((n) => n + 1);
  }

  return (
    <div className="w-full px-3 pt-2 md:px-5">
      <div className="mx-auto w-full max-w-7xl">
        <div className="pb-alert-strip" role="status">
          <WarningFilled style={{ fontSize: 14, flexShrink: 0 }} aria-hidden />
          <div className="pb-alert-main" title={preview}>
            <strong>
              {list.length} reminder{list.length === 1 ? "" : "s"}
            </strong>
            <span style={{ opacity: 0.85 }}> · {preview}</span>
            {more > 0 && <span style={{ opacity: 0.7 }}> (+{more})</span>}
          </div>
          <Button
            size="small"
            type="link"
            href="/admin/calendar"
            style={{ color: "inherit", fontWeight: 700, paddingInline: 4, height: 28, flexShrink: 0 }}
          >
            Calendar
          </Button>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            aria-label="Dismiss reminders until tomorrow or next login"
            onClick={dismiss}
            style={{ color: "inherit", width: 28, height: 28, flexShrink: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
