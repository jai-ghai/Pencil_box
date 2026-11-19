"use client";

/**
 * Used by src/app/admin/page.tsx (Today hero) and src/components/admin-alerts.tsx.
 * Both mounted on /admin and each fetched /api/admin/calendar/alerts separately —
 * this hook shares one in-flight request per page load (same pattern as useMe).
 * No DB access; plain client fetch.
 */
import { useEffect, useState } from "react";
import type { EventType } from "./shop-calendar";

export interface AlertEvent {
  id: string;
  date: string;
  title: string;
  type: EventType;
  itemsHint?: string;
  note?: string;
}

let cached: Promise<AlertEvent[]> | null = null;

function fetchAlerts(): Promise<AlertEvent[]> {
  cached ??= fetch("/api/admin/calendar/alerts")
    .then(async (r) => (r.ok ? ((await r.json()) as { events: AlertEvent[] }).events : []))
    .catch(() => []);
  return cached;
}

/** Today's/remind-window calendar alerts, shared between components on one page load. */
export function useCalendarAlerts(enabled: boolean): AlertEvent[] | undefined {
  const [events, setEvents] = useState<AlertEvent[] | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    fetchAlerts().then((e) => live && setEvents(e));
    return () => {
      live = false;
    };
  }, [enabled]);
  return events;
}
