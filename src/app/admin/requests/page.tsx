"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Empty, Flex, Image, Popconfirm, Select, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { api } from "@/lib/client";

type Status = "new" | "ordered" | "in_stock" | "declined";
interface Req { _id: string; name: string; note?: string; phone?: string; imageUrl?: string; status: Status; createdAt: string }

const STATUS: { value: Status; label: string; color: string }[] = [
  { value: "new", label: "New", color: "gold" },
  { value: "ordered", label: "Ordered from supplier", color: "blue" },
  { value: "in_stock", label: "Now in stock", color: "green" },
  { value: "declined", label: "Cannot get it", color: "default" },
];

export default function Requests() {
  const { message } = App.useApp();
  const [list, setList] = useState<Req[] | null>(null);

  useEffect(() => {
    api<{ requests: Req[] }>("/api/admin/requests")
      .then((d) => setList(d.requests))
      .catch((e: Error) => message.error(e.message));
  }, [message]);

  async function setStatus(r: Req, status: Status) {
    try {
      await api(`/api/admin/requests/${r._id}`, { method: "PATCH", body: { status } });
      setList((l) => l?.map((x) => (x._id === r._id ? { ...x, status } : x)) ?? null);
    } catch (e) {
      message.error((e as Error).message);
    }
  }
  async function remove(r: Req) {
    try {
      await api(`/api/admin/requests/${r._id}`, { method: "DELETE" });
      message.success("Deleted, including the phone number and photo");
      setList((l) => l?.filter((x) => x._id !== r._id) ?? null);
    } catch (e) {
      message.error((e as Error).message);
    }
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
          </div>
        </Flex>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "p", responsive: ["md"], render: (p?: string) => p ?? <Typography.Text type="secondary">not given</Typography.Text> },
    { title: "Date", key: "d", responsive: ["md"], render: (_: unknown, r) => new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) },
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
      key: "x",
      width: 60,
      render: (_: unknown, r) => (
        <Popconfirm title="Delete this request?" description="The phone number and photo are deleted too." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(r)}>
          <Button danger icon={<DeleteOutlined />} aria-label="Delete request" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Customer requests</Typography.Title>
      <Typography.Text type="secondary">Items visitors asked for on the website that you do not stock. Use the photo to add the product on the Products page, then delete the request.</Typography.Text>
      <Card styles={{ body: { padding: 0 } }}>
        <Table<Req> rowKey="_id" loading={!list} columns={columns} dataSource={list ?? []} pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No requests yet." /> }} />
      </Card>
    </div>
  );
}
