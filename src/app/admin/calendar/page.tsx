"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Badge,
  Button,
  Dropdown,
  Empty,
  Flex,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Skeleton,
  Typography,
  theme,
} from "antd";
import type { MenuProps } from "antd";
import { DeleteOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "@/lib/client";
import { istDate } from "@/lib/reports";
import { EVENT_TYPES, TYPE_LABEL, type EventType } from "@/lib/shop-calendar";
import { BRAND } from "@/lib/theme";
import { ShopMonthGrid } from "@/components/shop-month-grid";

interface CalEvent {
  id: string;
  date: string;
  title: string;
  type: EventType;
  note: string;
  itemsHint: string;
  remindDaysBefore: number;
}

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const TYPE_COLOR: Record<EventType, string> = {
  milestone: "#7c3aed",
  bill: "#dc2626",
  stock: "#2563eb",
  season: "#ea580c",
  note: "#64748b",
};

export default function CalendarPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  /** Phone / narrow: compact month + dots; md+ can show title chips. */
  const compact = !screens.md;
  const today = istDate(new Date());
  const [cursor, setCursor] = useState(() => dayjs(today));
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState<CalEvent[] | null>(null);
  const [err, setErr] = useState("");
  const [reload, setReload] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);

  const month = cursor.format("YYYY-MM");

  useEffect(() => {
    let live = true;
    setEvents(null);
    api<{ events: CalEvent[] }>(`/api/admin/calendar?month=${month}`)
      .then((d) => live && (setErr(""), setEvents(d.events)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [month, reload]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events ?? []) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);

  const dayEvents = byDate.get(selected) ?? [];
  const monthEvents = events ?? [];

  const surface = {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  } as const;

  async function seedSeasonal() {
    setSeedBusy(true);
    try {
      const year = Number(cursor.format("YYYY"));
      const r = await api<{ inserted: number }>("/api/admin/calendar", { method: "PUT", body: { action: "seasonal", year } });
      message.success(
        r.inserted
          ? `Added ${r.inserted} festival / season reminders for ${year}`
          : `Seasonal pack for ${year} is already on the calendar`,
      );
      setReload((n) => n + 1);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSeedBusy(false);
    }
  }

  async function seedBill(title: string, dayOfMonth: number) {
    setSeedBusy(true);
    try {
      const r = await api<{ inserted: number }>("/api/admin/calendar", {
        method: "PUT",
        body: { action: "monthly-bill", title, dayOfMonth, months: 12, remindDaysBefore: 1 },
      });
      message.success(`Added ${r.inserted} ${title} reminders (next 12 months)`);
      setReload((n) => n + 1);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSeedBusy(false);
    }
  }

  async function remove(e: CalEvent) {
    try {
      await api(`/api/admin/calendar/${e.id}`, { method: "DELETE" });
      message.success("Removed");
      setReload((n) => n + 1);
    } catch (err) {
      message.error((err as Error).message);
    }
  }

  const seedMenu: MenuProps = {
    items: [
      { key: "seasonal", label: "Load seasonal pack", onClick: () => void seedSeasonal() },
      { key: "rent", label: "Add rent (monthly)", onClick: () => void seedBill("Shop rent", 5) },
      { key: "electricity", label: "Add electricity (monthly)", onClick: () => void seedBill("Electricity bill", 10) },
    ],
  };

  const marks = useMemo(
    () => (events ?? []).map((e) => ({ id: e.id, date: e.date, title: e.title, color: TYPE_COLOR[e.type] })),
    [events],
  );

  return (
    <div className="pb-cal-page flex min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden">
      <Flex justify="space-between" align="flex-start" gap={12} wrap className="min-w-0">
        <div className="min-w-0">
          <Typography.Title level={2} style={{ margin: 0, fontSize: compact ? 20 : 22 }}>
            Shop calendar
          </Typography.Title>
          <Typography.Text type="secondary" className={compact ? "text-sm" : undefined}>
            Festivals, Valentine week, Gurpurab, rent and stock dates — reminders show at the top of admin.
          </Typography.Text>
        </div>
        {compact ? (
          <Flex gap={8} wrap className="w-full min-w-0">
            <Button type="primary" icon={<PlusOutlined />} block onClick={() => setAddOpen(true)}>
              Add for {dayLabel(selected)}
            </Button>
            <Dropdown menu={seedMenu} trigger={["click"]} disabled={seedBusy}>
              <Button block icon={<MoreOutlined />} loading={seedBusy}>
                Seasonal & bills
              </Button>
            </Dropdown>
          </Flex>
        ) : (
          <Flex gap={8} wrap>
            <Button loading={seedBusy} onClick={seedSeasonal} style={{ borderColor: BRAND.navy, color: BRAND.navy }}>
              Load seasonal pack
            </Button>
            <Button loading={seedBusy} onClick={() => seedBill("Shop rent", 5)}>
              Add rent (monthly)
            </Button>
            <Button loading={seedBusy} onClick={() => seedBill("Electricity bill", 10)}>
              Add electricity (monthly)
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
              Add for {dayLabel(selected)}
            </Button>
          </Flex>
        )}
      </Flex>

      {err && <Alert type="error" showIcon title={err} />}

      <div className="grid min-h-0 min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        {/* Month grid — compact dots on phone; chips on md+ */}
        <section style={surface} className="min-w-0 overflow-hidden">
          <div className={`min-w-0 ${compact ? "p-2" : "p-3 md:p-4"}`}>
            {!events && !err ? (
              <Skeleton active paragraph={{ rows: compact ? 6 : 10 }} />
            ) : (
              <ShopMonthGrid
                cursor={cursor}
                selected={selected}
                today={today}
                marks={marks}
                showTitles={!compact}
                onSelect={setSelected}
                onMonthChange={setCursor}
              />
            )}
          </div>
        </section>

        {/* Day + month agenda — primary readable content on phone */}
        <div className={`flex min-w-0 flex-col gap-4 ${compact ? "" : "min-h-0 xl:max-h-[calc(100dvh-11rem)]"}`}>
          <section style={surface} className={`flex flex-col overflow-hidden ${compact ? "" : "min-h-0 flex-1"}`}>
            <Flex
              justify="space-between"
              align="center"
              gap={8}
              wrap
              className="shrink-0 border-b px-3 py-3 sm:px-4"
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <Typography.Title level={3} style={{ margin: 0, fontSize: 16 }} className="min-w-0 truncate">
                {dayLabel(selected)}
              </Typography.Title>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                Add
              </Button>
            </Flex>
            <div className={compact ? "px-3 py-3 sm:px-4" : "pb-scroll-y min-h-0 flex-1 px-3 py-3 sm:px-4"}>
              {dayEvents.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing on this day. Add a bill, stock note or festival reminder." />
              ) : (
                <Flex vertical gap={12}>
                  {dayEvents.map((e) => (
                    <EventRow key={e.id} e={e} onRemove={remove} />
                  ))}
                </Flex>
              )}
            </div>
          </section>

          <section style={surface} className={`flex flex-col overflow-hidden ${compact ? "" : "min-h-[200px] flex-[1.2]"}`}>
            <Flex
              justify="space-between"
              align="center"
              className="shrink-0 border-b px-3 py-3 sm:px-4"
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <Typography.Title level={3} style={{ margin: 0, fontSize: 16 }}>
                This month ({monthEvents.length})
              </Typography.Title>
            </Flex>
            <div className={compact ? "px-3 py-3 sm:px-4" : "pb-scroll-y min-h-0 flex-1 px-3 py-3 sm:px-4"}>
              {monthEvents.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No events this month. Tap Load seasonal pack for Valentine week, Guru Nanak Jayanti, Diwali and more."
                />
              ) : (
                <ul className="m-0 list-none p-0">
                  {monthEvents.map((e, i) => (
                    <li
                      key={e.id}
                      className="cursor-pointer py-2.5 transition-colors"
                      style={{ borderTop: i === 0 ? "none" : `1px solid ${token.colorBorderSecondary}` }}
                      onClick={() => {
                        setSelected(e.date);
                        setCursor(dayjs(e.date));
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          setSelected(e.date);
                          setCursor(dayjs(e.date));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-2">
                        <Badge color={TYPE_COLOR[e.type]} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold tabular-nums" style={{ color: token.colorTextSecondary }}>
                            {dayLabel(e.date)}
                          </div>
                          <div className="truncate font-semibold">{e.title}</div>
                          {e.itemsHint && (
                            <div className="truncate text-sm" style={{ color: "#c2410c" }}>
                              {e.itemsHint}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section style={surface} className="shrink-0 px-3 py-3 sm:px-4">
            <Typography.Paragraph style={{ margin: 0 }} type="secondary" className="text-sm">
              {compact ? (
                <>
                  Tap a day for its agenda below. Use <strong>Seasonal &amp; bills</strong> for festival packs, rent and
                  electricity. Alerts appear at the top of admin on the day and in the remind window.
                </>
              ) : (
                <>
                  Tap <strong>Load seasonal pack</strong> once per year (again after updates) for Rose Day, Valentine&apos;s,
                  Guru Nanak Jayanti, Children&apos;s Day, Diwali, Friendship Day and more — each with what to stock. Scroll
                  the month grid and the lists on the right. Alerts appear at the top of admin on the day and in the remind
                  window.
                </>
              )}
            </Typography.Paragraph>
          </section>
        </div>
      </div>

      <AddEventModal
        open={addOpen}
        date={selected}
        compact={compact}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          setReload((n) => n + 1);
        }}
      />
    </div>
  );
}

function EventRow({ e, onRemove }: { e: CalEvent; onRemove: (e: CalEvent) => void }) {
  const { token } = theme.useToken();
  return (
    <div style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 10 }}>
      <Flex justify="space-between" gap={8} align="start">
        <div className="min-w-0 flex-1">
          <Typography.Text type="secondary" className="text-xs">
            {TYPE_LABEL[e.type]}
          </Typography.Text>
          <div className="font-semibold">{e.title}</div>
          {e.itemsHint && (
            <div className="text-sm" style={{ color: "#c2410c" }}>
              Stock / offer: {e.itemsHint}
            </div>
          )}
          {e.note && <div className="text-sm opacity-80">{e.note}</div>}
          <Typography.Text type="secondary" className="text-xs">
            Alert {e.remindDaysBefore} day{e.remindDaysBefore === 1 ? "" : "s"} before
          </Typography.Text>
        </div>
        <Popconfirm title="Delete this event?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => onRemove(e)}>
          <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Delete ${e.title}`} />
        </Popconfirm>
      </Flex>
    </div>
  );
}

function AddEventModal({
  open,
  date,
  compact,
  onClose,
  onSaved,
}: {
  open: boolean;
  date: string;
  compact: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal
      open={open}
      title={`Add event — ${dayLabel(date)}`}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
      width={compact ? "100%" : 520}
      centered
      className="pb-cal-modal"
      styles={compact ? { body: { paddingTop: 12 } } : undefined}
    >
      <AddEventForm key={date} date={date} compact={compact} onSaved={onSaved} />
    </Modal>
  );
}

function AddEventForm({ date, compact, onSaved }: { date: string; compact: boolean; onSaved: () => void }) {
  const { message } = App.useApp();
  const [type, setType] = useState<EventType>("note");
  const [title, setTitle] = useState("");
  const [itemsHint, setItemsHint] = useState("");
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState(1);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) {
      message.warning("Enter a title");
      return;
    }
    setBusy(true);
    try {
      await api("/api/admin/calendar", {
        method: "POST",
        body: {
          date,
          type,
          title: title.trim(),
          itemsHint: itemsHint.trim() || undefined,
          note: note.trim() || undefined,
          remindDaysBefore: remind,
        },
      });
      message.success("Saved");
      onSaved();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const typeOptions = EVENT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t].split(" ")[0] }));

  return (
    <Flex vertical gap={12} className="min-w-0">
      {compact ? (
        <div>
          <label htmlFor="cal-type" className="mb-1 block text-sm font-semibold">
            Type
          </label>
          <Select
            id="cal-type"
            style={{ width: "100%" }}
            size="large"
            value={type}
            onChange={setType}
            options={EVENT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
            aria-label="Event type"
          />
        </div>
      ) : (
        <Segmented<EventType> block value={type} onChange={setType} options={typeOptions} aria-label="Event type" />
      )}
      <div>
        <label htmlFor="cal-title" className="mb-1 block text-sm font-semibold">
          Title
        </label>
        <Input
          id="cal-title"
          size="large"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "bill" ? "Shop rent" : type === "stock" ? "New Doms stock arrived" : "Title"}
          maxLength={120}
        />
      </div>
      {(type === "season" || type === "stock") && (
        <div>
          <label htmlFor="cal-items" className="mb-1 block text-sm font-semibold">
            Items to stock / offer
          </label>
          <Input.TextArea
            id="cal-items"
            value={itemsHint}
            onChange={(e) => setItemsHint(e.target.value)}
            placeholder="Notebooks, pencils, geometry boxes…"
            autoSize={{ minRows: 2, maxRows: 4 }}
            maxLength={400}
          />
        </div>
      )}
      <div>
        <label htmlFor="cal-note" className="mb-1 block text-sm font-semibold">
          Note (optional)
        </label>
        <Input id="cal-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>
      <div>
        <label htmlFor="cal-remind" className="mb-1 block text-sm font-semibold">
          Remind me
        </label>
        <Select
          id="cal-remind"
          style={{ width: "100%" }}
          size="large"
          value={remind}
          onChange={setRemind}
          options={[
            { value: 0, label: "Only on the day" },
            { value: 1, label: "1 day before + on the day" },
            { value: 3, label: "3 days before" },
            { value: 7, label: "7 days before" },
            { value: 14, label: "14 days before" },
          ]}
        />
      </div>
      {type === "milestone" && (
        <Typography.Text type="secondary" className="text-xs">
          Tip: use this for &quot;Pencil Box opened&quot; on your start date.
        </Typography.Text>
      )}
      <Flex justify="flex-end">
        <Button type="primary" size="large" loading={busy} onClick={save} block={compact}>
          Save
        </Button>
      </Flex>
    </Flex>
  );
}
