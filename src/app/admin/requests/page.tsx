"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, Flex, Image, Popconfirm, Segmented, Select, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "@/lib/client";
import { QuickAddModal, type QuickAddSeed } from "@/components/quick-add-modal";

type Status = "new" | "ordered" | "in_stock" | "declined";
interface Req { _id: string; name: string; note?: string; phone?: string; imageUrl?: string; status: Status; createdAt: string }
type Filter = "open" | "all";

const STATUS: { value: Status; label: string; color: string }[] = [
  { value: "new", label: "New", color: "gold" },
  { value: "ordered", label: "Ordered from supplier", color: "blue" },
  { value: "in_stock", label: "Now in stock", color: "green" },
  { value: "declined", label: "Cannot get it", color: "default" },
];

const isOpen = (s: Status) => s === "new" || s === "ordered";

export default function Requests() {
  const { message } = App.useApp();
  const [list, setList] = useState<Req[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [brands, setBrands] = useState<string[]>([]);
  const [seed, setSeed] = useState<QuickAddSeed | null>(null);

  const load = useCallback(async () => {
    const d = await api<{ requests: Req[] }>("/api/admin/requests");
    setList(d.requests);
  }, []);

  useEffect(() => {
    Promise.all([load(), api<{ brands: { name: string }[] }>("/api/admin/brands")])
      .then(([, b]) => setBrands(b.brands.map((x) => x.name).filter(Boolean)))
      .catch((e: Error) => message.error(e.message));
  }, [load, message]);

  const shown = useMemo(() => {
    if (!list) return [];
    return filter === "open" ? list.filter((r) => isOpen(r.status)) : list;
  }, [list, filter]);

  async function setStatus(r: Req, status: Status) {
    try {
      await api(`/api/admin/requests/${r._id}`, { method: "PATCH", body: { status } });
      setList((l) => l?.map((x) => (x._id === r._id ? { ...x, status } : x)) ?? null);
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  async function drop(r: Req) {
    try {
      await api(`/api/admin/requests/${r._id}`, { method: "DELETE" });
      message.success("Dropped from the list");
      setList((l) => l?.filter((x) => x._id !== r._id) ?? null);
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  function addToShop(r: Req) {
    setSeed({ requestId: r._id, line: r.name, imageUrl: r.imageUrl ?? null });
  }

  const columns: TableColumnsType<Req> = [
    {
      title: "Customer asked for",
      key: "n",
      render: (_: unknown, r) => (
        <Flex gap={12} align="center">
          {r.imageUrl && <Image src={r.imageUrl} alt="" width={56} height={56} style={{ objectFit: "cover", borderRadius: 8 }} />}
          <div>
            <div style={{ fontWeight: 600 }}>{r.name}</div>
            {r.note && <Typography.Text type="secondary">{r.note}</Typography.Text>}
            {r.phone && <div><Typography.Text type="secondary" className="text-xs">Phone {r.phone}</Typography.Text></div>}
          </div>
        </Flex>
      ),
    },
    { title: "Date", key: "d", responsive: ["md"], width: 110, render: (_: unknown, r) => new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) },
    {
      title: "Status",
      key: "s",
      width: 210,
      render: (_: unknown, r) => (
        <Select<Status> value={r.status} onChange={(v) => setStatus(r, v)} style={{ width: 190 }} options={STATUS.map((s) => ({ value: s.value, label: <Tag color={s.color} style={{ margin: 0 }}>{s.label}</Tag> }))} />
      ),
    },
    {
      title: "",
      key: "a",
      width: 220,
      render: (_: unknown, r) => (
        <Flex gap={8} justify="flex-end" wrap>
          {isOpen(r.status) && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => addToShop(r)}>
              Add to shop
            </Button>
          )}
          <Popconfirm title="Drop this request?" description="Removes it from the list (phone and photo too)." okText="Drop" okButtonProps={{ danger: true }} onConfirm={() => drop(r)}>
            <Button danger icon={<DeleteOutlined />} aria-label="Drop request">Drop</Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Customer requests</Typography.Title>
          <Typography.Text type="secondary">Items visitors asked for on the website. Add to shop, then it leaves the open list.</Typography.Text>
        </div>
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: `Open (${list ? list.filter((r) => isOpen(r.status)).length : "…"})` },
            { value: "all", label: "All" },
          ]}
          aria-label="Request filter"
        />
      </Flex>

      <Card styles={{ body: { padding: 0 } }}>
        <Table<Req>
          rowKey="_id"
          loading={!list}
          columns={columns}
          dataSource={shown}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filter === "open" ? "No open requests. Nice." : "No requests yet."} /> }}
        />
      </Card>

      <QuickAddModal
        open={!!seed}
        brands={brands}
        seed={seed}
        onClose={() => setSeed(null)}
        onSaved={async () => {
          setSeed(null);
          await load();
        }}
      />
    </div>
  );
}
