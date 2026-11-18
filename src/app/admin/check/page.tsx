"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Empty, Flex, Input, InputNumber, Popconfirm, Progress, Segmented, Select, Skeleton, Tag, Typography } from "antd";
import { CheckOutlined, CloseOutlined, CopyOutlined, ReloadOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { api, inr } from "@/lib/client";
import { istDate } from "@/lib/reports";
import { buyListText, checkProgress, groupBuyList } from "@/lib/shopcheck";
import type { CheckItem } from "@/lib/shopcheck-data";

type View = "check" | "buy";
type Filter = "todo" | "crossed" | "ticked" | "all";
type Status = "ok" | "missing" | "clear";
interface Data { items: CheckItem[]; roundStart: string | null }

const PAGE = 120; // rows drawn at once, so a phone stays quick
const isDone = (i: CheckItem) => i.inRound && i.status !== null;

export default function ShopCheckPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<View>("check");

  const [tick, setTick] = useState(0);
  const load = async () => setTick((n) => n + 1); // refetch from the server
  useEffect(() => {
    let live = true;
    api<Data>("/api/admin/check")
      .then((d) => live && (setErr(""), setData(d)))
      .catch((e: Error) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [tick]);

  /** Tick, cross or clear. The screen updates first and is put back if the server says no. */
  async function mark(ids: string[], status: Status) {
    if (!data) return;
    const before = data;
    const now = new Date().toISOString();
    setData({
      ...data,
      items: data.items.map((i) => (ids.includes(i.id) ? { ...i, status: status === "clear" ? null : status, inRound: status !== "clear", checkedAt: status === "clear" ? null : now } : i)),
    });
    try {
      await api("/api/admin/check", { method: "POST", body: { variantIds: ids, status } });
    } catch (e) {
      setData(before);
      message.error((e as Error).message);
    }
  }
  async function setQty(id: string, needQty: number) {
    if (!data) return;
    setData({ ...data, items: data.items.map((i) => (i.id === id ? { ...i, needQty } : i)) });
    try {
      await api("/api/admin/check", { method: "PATCH", body: { variantId: id, needQty } });
    } catch (e) {
      message.error((e as Error).message);
      void load();
    }
  }
  async function newRound() {
    try {
      await api("/api/admin/check/round", { method: "POST" });
      message.success("New round started. Crossed items stay on the buy list.");
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const crossed = useMemo(() => (data?.items ?? []).filter((i) => i.status === "missing"), [data]);

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Shop check</Typography.Title>
        <Segmented<View> value={view} onChange={setView} options={[{ value: "check", label: "Check items" }, { value: "buy", label: `Buy list (${crossed.length})` }]} aria-label="Shop check view" />
      </Flex>
      {err && <Alert type="error" showIcon title={err} />}
      {!data && !err && <Skeleton active paragraph={{ rows: 10 }} />}
      {data && view === "check" && <CheckView items={data.items} roundStart={data.roundStart} onMark={mark} onNewRound={newRound} />}
      {data && view === "buy" && <BuyView items={crossed} onMark={mark} onQty={setQty} />}
    </div>
  );
}

function CheckView({ items, roundStart, onMark, onNewRound }: { items: CheckItem[]; roundStart: string | null; onMark: (ids: string[], s: Status) => void; onNewRound: () => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [filter, setFilter] = useState<Filter>("todo");
  const [limit, setLimit] = useState(PAGE);
  const progress = checkProgress(items);
  const doneCount = items.filter(isDone).length;
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (cat && i.category !== cat) return false;
      if (filter === "todo" && isDone(i)) return false;
      if (filter === "crossed" && i.status !== "missing") return false;
      if (filter === "ticked" && !(i.status === "ok" && i.inRound)) return false;
      const hay = `${i.name} ${i.code} ${i.supplier}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [items, q, cat, filter]);

  const visible = shown.slice(0, limit);
  const groups = useMemo(() => {
    const m = new Map<string, CheckItem[]>();
    for (const i of visible) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m];
  }, [visible]);

  return (
    <>
      <Card size="small" className="sticky top-16 z-30">
        <Flex align="center" gap={16} wrap>
          <div style={{ flex: "1 1 220px" }}>
            <Flex justify="space-between" className="text-sm">
              <span><strong>{doneCount}</strong> of {progress.total} checked</span>
              <span>{progress.left} left</span>
            </Flex>
            <Progress percent={progress.pct} showInfo={false} aria-label="Check progress" />
          </div>
          <Tag color="error" style={{ fontSize: 14, padding: "4px 10px" }}>{progress.missing} missing</Tag>
          <Popconfirm title="Start a new round?" description="Every item needs ticking again. Crossed items stay on the buy list." okText="Start new round" onConfirm={onNewRound}>
            <Button icon={<ReloadOutlined />}>New round</Button>
          </Popconfirm>
        </Flex>
        {roundStart && <Typography.Text type="secondary" className="text-xs">Round started {new Date(roundStart).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</Typography.Text>}
      </Card>

      <Flex gap={8} wrap align="center">
        <Input.Search allowClear placeholder="Search name or code" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} style={{ maxWidth: 280 }} aria-label="Search items" />
        <Select allowClear placeholder="All categories" value={cat || undefined} onChange={(v) => (setCat(v ?? ""), setLimit(PAGE))} options={categories.map((c) => ({ value: c, label: c }))} style={{ minWidth: 180 }} aria-label="Category" />
        <div className="pb-scroll-x max-w-full">
          <Segmented<Filter> value={filter} onChange={(f) => (setFilter(f), setLimit(PAGE))} options={[{ value: "todo", label: "To check" }, { value: "crossed", label: "Crossed" }, { value: "ticked", label: "Ticked" }, { value: "all", label: "All" }]} aria-label="Show" />
        </div>
      </Flex>

      {shown.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filter === "todo" && !q && !cat ? "Everything is checked in this round." : "No items match."} />}

      {groups.map(([category, rows]) => (
        <Card
          key={category}
          size="small"
          title={category}
          extra={filter === "todo" && rows.length > 1 && <Popconfirm title={`Tick all ${rows.length} items shown in ${category}?`} okText="Tick all" onConfirm={() => onMark(rows.map((r) => r.id), "ok")}><Button size="small">Tick all {rows.length}</Button></Popconfirm>}
          styles={{ body: { padding: 0 } }}
        >
          {rows.map((i) => (
            <CheckRow key={i.id} item={i} onMark={onMark} />
          ))}
        </Card>
      ))}
      {shown.length > limit && <Button onClick={() => setLimit(limit + PAGE)}>Show more ({shown.length - limit} left)</Button>}
    </>
  );
}

function CheckRow({ item: i, onMark }: { item: CheckItem; onMark: (ids: string[], s: Status) => void }) {
  const ticked = i.status === "ok" && i.inRound;
  const crossed = i.status === "missing";
  const old = i.status === "ok" && !i.inRound && i.checkedAt ? `ticked ${new Date(i.checkedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : "";
  return (
    <Flex align="center" justify="space-between" gap={8} className="px-4 py-2" style={{ borderBottom: "1px solid rgba(128,128,128,0.18)" }}>
      <div className="min-w-0">
        <div className="font-semibold" style={{ overflowWrap: "anywhere" }}>{i.name}</div>
        <Typography.Text type="secondary" className="text-xs">{[i.code, i.supplier, old, crossed && !i.inRound ? "still missing" : ""].filter(Boolean).join(" · ")}</Typography.Text>
      </div>
      <Flex gap={8} className="shrink-0">
        <Button
          aria-label={`${i.name}: it is there`}
          aria-pressed={ticked}
          type={ticked ? "primary" : "default"}
          icon={<CheckOutlined />}
          style={{ width: 48, height: 48, ...(ticked ? { background: "#15803d", borderColor: "#15803d", color: "#fff" } : { color: "#15803d" }) }}
          onClick={() => onMark([i.id], ticked ? "clear" : "ok")}
        />
        <Button
          aria-label={`${i.name}: it is missing`}
          aria-pressed={crossed}
          danger
          type={crossed ? "primary" : "default"}
          icon={<CloseOutlined />}
          style={{ width: 48, height: 48 }}
          onClick={() => onMark([i.id], crossed ? "clear" : "missing")}
        />
      </Flex>
    </Flex>
  );
}

/** Typed value is kept until Enter or leaving the box; the parent re-keys it when the saved value changes. */
function QtyInput({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [v, setV] = useState<number | null>(value);
  const commit = () => v && v !== value && onCommit(v);
  return <InputNumber aria-label={label} min={1} max={100000} precision={0} value={v} onChange={setV} onBlur={commit} onPressEnter={commit} style={{ width: 90 }} />;
}

function BuyView({ items, onMark, onQty }: { items: CheckItem[]; onMark: (ids: string[], s: Status) => void; onQty: (id: string, n: number) => void }) {
  const { message } = App.useApp();
  const date = istDate(new Date());
  const { groups, estimate, lines, unpriced } = groupBuyList(items.map((i) => ({ id: i.id, code: i.code, name: i.name, supplier: i.supplier, needQty: i.needQty, cost: i.cost })));
  const text = buyListText(groups, date);
  const byId = new Map(items.map((i) => [i.id, i]));

  if (!lines) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="The buy list is empty. Cross an item in Check items and it will appear here." />;

  return (
    <>
      <Card size="small">
        <Flex justify="space-between" align="center" gap={12} wrap>
          <div>
            <Typography.Text strong style={{ fontSize: 18 }}>{lines} item{lines === 1 ? "" : "s"} to buy</Typography.Text>
            <div className="text-sm opacity-80">About {inr(estimate)} at your cost prices{unpriced > 0 && ` (${unpriced} item${unpriced === 1 ? " has" : "s have"} no cost price yet)`}</div>
          </div>
          <Flex gap={8} wrap>
            <Button icon={<CopyOutlined />} onClick={() => navigator.clipboard?.writeText(text).then(() => message.success("List copied"), () => message.error("Could not copy"))}>Copy list</Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><Button icon={<WhatsAppOutlined />}>Send on WhatsApp</Button></a>
          </Flex>
        </Flex>
      </Card>

      {groups.map((g) => (
        <Card
          key={g.supplier}
          size="small"
          title={<>{g.supplier} <Typography.Text type="secondary" style={{ fontWeight: 400 }}>· {g.lines} item{g.lines === 1 ? "" : "s"}{g.estimate > 0 && ` · about ${inr(g.estimate)}`}</Typography.Text></>}
          extra={<Popconfirm title={`Mark all ${g.lines} from ${g.supplier} as bought?`} okText="All bought" onConfirm={() => onMark(g.items.map((i) => i.id), "ok")}><Button size="small" icon={<CheckOutlined />}>All bought</Button></Popconfirm>}
          styles={{ body: { padding: 0 } }}
        >
          {g.items.map((i) => (
            <Flex key={i.id} align="center" justify="space-between" gap={8} wrap className="px-4 py-2" style={{ borderBottom: "1px solid rgba(128,128,128,0.18)" }}>
              <div className="min-w-0" style={{ flex: "1 1 200px" }}>
                <div className="font-semibold" style={{ overflowWrap: "anywhere" }}>{i.name}</div>
                <Typography.Text type="secondary" className="text-xs">{i.code}{(byId.get(i.id)?.packSize ?? 1) > 1 && ` · pack of ${byId.get(i.id)?.packSize}`}{i.cost > 0 && ` · cost ${inr(i.cost)} each`}</Typography.Text>
              </div>
              <Flex gap={8} align="center">
                <QtyInput key={`${i.id}-${i.needQty}`} value={i.needQty} label={`How many ${i.name} to buy`} onCommit={(n) => onQty(i.id, n)} />
                <Button type="primary" icon={<CheckOutlined />} onClick={() => onMark([i.id], "ok")} aria-label={`${i.name}: bought`}>Bought</Button>
                <Popconfirm title="Remove from the buy list?" description="It goes back to 'not checked'." okText="Remove" onConfirm={() => onMark([i.id], "clear")}>
                  <Button aria-label={`Remove ${i.name} from the buy list`} icon={<CloseOutlined />} />
                </Popconfirm>
              </Flex>
            </Flex>
          ))}
        </Card>
      ))}
    </>
  );
}
