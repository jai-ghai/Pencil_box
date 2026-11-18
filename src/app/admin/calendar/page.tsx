"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Badge, Button, Calendar, Card, Col, Empty, Flex, Input, Modal, Popconfirm, Row, Segmented, Select, Skeleton, Typography } from "antd";
import type { CalendarProps } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { api } from "@/lib/client";
import { istDate } from "@/lib/reports";
import { EVENT_TYPES, TYPE_LABEL, type EventType } from "@/lib/shop-calendar";

interface CalEvent {
  id: string;
  date: string;
  title: string;
  type: EventType;
  note: string;
  itemsHint: string;
  remindDaysBefore: number;
}

const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const TYPE_COLOR: Record<EventType, string> = {
  milestone: "purple",
  bill: "red",
  stock: "blue",
  season: "orange",
  note: "#8c8c8c",
};

export default function CalendarPage() {
  const { message } = App.useApp();
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

  async function seedSeasonal() {
    setSeedBusy(true);
    try {
      const year = Number(cursor.format("YYYY"));
      const r = await api<{ inserted: number }>("/api/admin/calendar", { method: "PUT", body: { action: "seasonal", year } });
      message.success(r.inserted ? `Added ${r.inserted} festival / season reminders for ${year}` : `Seasonal pack for ${year} is already on the calendar`);
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

  const cellRender: CalendarProps<Dayjs>["cellRender"] = (value, info) => {
    if (info.type !== "date") return info.originNode;
    const key = value.format("YYYY-MM-DD");
    const list = byDate.get(key) ?? [];
    return (
      <div className="flex flex-col gap-0.5">
        {list.slice(0, 3).map((e) => (
          <Badge key={e.id} color={TYPE_COLOR[e.type]} text={<span style={{ fontSize: 11 }}>{e.title}</span>} />
        ))}
        {list.length > 3 && <span style={{ fontSize: 11, opacity: 0.7 }}>+{list.length - 3}</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Shop calendar</Typography.Title>
          <Typography.Text type="secondary">Festivals, rent, electricity, stock dates — reminders show at the top of admin.</Typography.Text>
        </div>
        <Flex gap={8} wrap>
          <Button loading={seedBusy} onClick={seedSeasonal}>Load seasonal pack</Button>
          <Button loading={seedBusy} onClick={() => seedBill("Shop rent", 5)}>Add rent (monthly)</Button>
          <Button loading={seedBusy} onClick={() => seedBill("Electricity bill", 10)}>Add electricity (monthly)</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Add for {dayLabel(selected)}</Button>
        </Flex>
      </Flex>

      {err && <Alert type="error" showIcon title={err} />}

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card styles={{ body: { padding: 8 } }}>
            {!events && !err ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
              <Calendar
                fullscreen={false}
                value={cursor}
                onSelect={(d) => {
                  setCursor(d);
                  setSelected(d.format("YYYY-MM-DD"));
                }}
                onPanelChange={(d) => setCursor(d)}
                cellRender={cellRender}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={dayLabel(selected)} extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Add</Button>}>
            {dayEvents.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing on this day. Add a bill, stock note or festival reminder." />
            ) : (
              <Flex vertical gap={12}>
                {dayEvents.map((e) => (
                  <div key={e.id} style={{ borderBottom: "1px solid rgba(128,128,128,0.18)", paddingBottom: 10 }}>
                    <Flex justify="space-between" gap={8} align="start">
                      <div>
                        <Typography.Text type="secondary" className="text-xs">{TYPE_LABEL[e.type]}</Typography.Text>
                        <div className="font-semibold">{e.title}</div>
                        {e.itemsHint && <div className="text-sm" style={{ color: "#b45309" }}>Stock / offer: {e.itemsHint}</div>}
                        {e.note && <div className="text-sm opacity-80">{e.note}</div>}
                        <Typography.Text type="secondary" className="text-xs">Alert {e.remindDaysBefore} day{e.remindDaysBefore === 1 ? "" : "s"} before</Typography.Text>
                      </div>
                      <Popconfirm title="Delete this event?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(e)}>
                        <Button type="text" danger icon={<DeleteOutlined />} aria-label={`Delete ${e.title}`} />
                      </Popconfirm>
                    </Flex>
                  </div>
                ))}
              </Flex>
            )}
          </Card>

          <Card size="small" className="mt-3" title="Quick tip">
            <Typography.Paragraph style={{ margin: 0 }} type="secondary">
              Tap <strong>Load seasonal pack</strong> once per year for back-to-school, exams, Rakhi, Diwali, Teachers&apos; Day and New Year planners — each with what to stock. Rent and electricity create 12 monthly reminders. Alerts appear at the top of every admin page on the day and the day before (or earlier for seasons).
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <AddEventModal
        open={addOpen}
        date={selected}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          setReload((n) => n + 1);
        }}
      />
    </div>
  );
}

function AddEventModal({ open, date, onClose, onSaved }: { open: boolean; date: string; onClose: () => void; onSaved: () => void }) {
  return (
    <Modal open={open} title={`Add event — ${dayLabel(date)}`} onCancel={onClose} destroyOnHidden footer={null}>
      <AddEventForm key={date} date={date} onSaved={onSaved} />
    </Modal>
  );
}

function AddEventForm({ date, onSaved }: { date: string; onSaved: () => void }) {
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

  return (
    <Flex vertical gap={12}>
      <Segmented<EventType>
        block
        value={type}
        onChange={setType}
        options={EVENT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t].split(" ")[0] }))}
        aria-label="Event type"
      />
      <div>
        <label htmlFor="cal-title" className="mb-1 block text-sm font-semibold">Title</label>
        <Input id="cal-title" size="large" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "bill" ? "Shop rent" : type === "stock" ? "New Doms stock arrived" : "Title"} maxLength={120} />
      </div>
      {(type === "season" || type === "stock") && (
        <div>
          <label htmlFor="cal-items" className="mb-1 block text-sm font-semibold">Items to stock / offer</label>
          <Input.TextArea id="cal-items" value={itemsHint} onChange={(e) => setItemsHint(e.target.value)} placeholder="Notebooks, pencils, geometry boxes…" autoSize={{ minRows: 2, maxRows: 4 }} maxLength={400} />
        </div>
      )}
      <div>
        <label htmlFor="cal-note" className="mb-1 block text-sm font-semibold">Note (optional)</label>
        <Input id="cal-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>
      <div>
        <label htmlFor="cal-remind" className="mb-1 block text-sm font-semibold">Remind me</label>
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
        <Typography.Text type="secondary" className="text-xs">Tip: use this for &quot;Pencil Box opened&quot; on your start date.</Typography.Text>
      )}
      <Flex justify="flex-end">
        <Button type="primary" size="large" loading={busy} onClick={save}>Save</Button>
      </Flex>
    </Flex>
  );
}
