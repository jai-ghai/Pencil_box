"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Col, Flex, Form, Input, Modal, Popconfirm, Row, Select, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { api } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";
import { SimpleList } from "@/components/simple-list";

interface Brand { _id: string; name: string; products: number }
interface Cat { _id: string; name_en: string; name_hi?: string; slug: string; parentId?: string | null; products: number }
type Editing = { kind: "brands" | "categories"; id: string; name: string; name_hi?: string } | null;

export default function Setup() {
  const { message } = App.useApp();
  const me = useMe();
  const canDelete = can(me, "products:delete");
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);
  const [brandForm] = Form.useForm<{ name: string }>();
  const [catForm] = Form.useForm<{ name_en: string; name_hi?: string; parentId?: string }>();
  const [editForm] = Form.useForm<{ name: string; name_hi?: string }>();

  const load = useCallback(async () => {
    const [b, c] = await Promise.all([api<{ brands: Brand[] }>("/api/admin/brands"), api<{ categories: Cat[] }>("/api/admin/categories")]);
    setBrands(b.brands);
    setCats(c.categories);
  }, []);
  useEffect(() => {
    Promise.all([api<{ brands: Brand[] }>("/api/admin/brands"), api<{ categories: Cat[] }>("/api/admin/categories")])
      .then(([b, c]) => (setBrands(b.brands), setCats(c.categories)))
      .catch((e: Error) => message.error(e.message));
  }, [message]);

  const tops = useMemo(() => (cats ?? []).filter((c) => !c.parentId), [cats]);

  async function run(fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      message.success(done);
      await load();
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const v = await editForm.validateFields();
    setSaving(true);
    await run(
      () => api(`/api/admin/${editing.kind}/${editing.id}`, { method: "PATCH", body: editing.kind === "brands" ? { name: v.name.trim() } : { name_en: v.name.trim(), name_hi: v.name_hi?.trim() || undefined } }),
      "Saved",
    );
    setSaving(false);
    setEditing(null);
  }

  const remove = (kind: "brands" | "categories", id: string, label: string) => run(() => api(`/api/admin/${kind}/${id}`, { method: "DELETE" }), `${label} deleted`);

  const rowButtons = (kind: "brands" | "categories", item: { _id: string; name: string; name_hi?: string; products: number }) => (
    <Flex gap={4} align="center">
      <Button size="small" icon={<EditOutlined />} aria-label={`Edit ${item.name}`} onClick={() => (editForm.setFieldsValue({ name: item.name, name_hi: item.name_hi }), setEditing({ kind, id: item._id, name: item.name, name_hi: item.name_hi }))}>Edit</Button>
      {canDelete && (
        <Popconfirm
          title={`Delete "${item.name}"?`}
          description={item.products > 0 ? `${item.products} product${item.products === 1 ? " uses" : "s use"} it, so it cannot be deleted until they are moved.` : "This cannot be undone."}
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => remove(kind, item._id, item.name)}
        >
          <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${item.name}`} />
        </Popconfirm>
      )}
    </Flex>
  );

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <Card title="Brands">
            <Form form={brandForm} layout="inline" onFinish={(v) => run(async () => { await api("/api/admin/brands", { body: { name: v.name.trim() } }); brandForm.resetFields(); }, "Brand added")} className="mb-4">
              <Form.Item name="name" rules={[{ required: true, message: "Enter a brand" }]} style={{ flex: 1 }}><Input placeholder="e.g. Doms" aria-label="Brand name" /></Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Add</Button>
            </Form>
            <SimpleList
              loading={!brands}
              dataSource={brands ?? []}
              emptyText="No brands yet"
              getKey={(b) => b._id}
              renderItem={(b) => (
                <Flex justify="space-between" align="center" gap={8} className="w-full">
                  <span>{b.name} <Typography.Text type="secondary" style={{ fontSize: 12 }}>{b.products} item{b.products === 1 ? "" : "s"}</Typography.Text></span>
                  {rowButtons("brands", { _id: b._id, name: b.name, products: b.products })}
                </Flex>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card title="Categories">
            <Form form={catForm} layout="vertical" onFinish={(v) => run(async () => { await api("/api/admin/categories", { body: { name_en: v.name_en.trim(), name_hi: v.name_hi?.trim() || undefined, parentId: v.parentId ?? null } }); catForm.resetFields(); }, "Category added")} className="mb-4">
              <Row gutter={12}>
                <Col xs={24} sm={8}><Form.Item label="English" name="name_en" rules={[{ required: true, message: "Enter a name" }]}><Input placeholder="Toys" /></Form.Item></Col>
                <Col xs={24} sm={8}><Form.Item label="हिंदी" name="name_hi"><Input placeholder="खिलौने" /></Form.Item></Col>
                <Col xs={24} sm={8}><Form.Item label="Inside (optional)" name="parentId"><Select allowClear placeholder="Top level" options={tops.map((t) => ({ value: t._id, label: t.name_en }))} /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Add category</Button>
            </Form>
            <SimpleList
              loading={!cats}
              dataSource={tops}
              emptyText="No categories yet"
              getKey={(t) => t._id}
              renderItem={(t) => (
                <Flex vertical gap={8} className="w-full">
                  <Flex justify="space-between" align="center" gap={8}>
                    <span><Typography.Text strong>{t.name_en}</Typography.Text> <Typography.Text type="secondary">{t.name_hi}</Typography.Text></span>
                    {rowButtons("categories", { _id: t._id, name: t.name_en, name_hi: t.name_hi, products: t.products })}
                  </Flex>
                  <Flex vertical gap={6} style={{ paddingInlineStart: 12 }}>
                    {(cats ?? []).filter((c) => c.parentId === t._id).map((c) => (
                      <Flex key={c._id} justify="space-between" align="center" gap={8}>
                        <span>{c.name_en} <Tag style={{ marginInlineStart: 6 }}>{c.products}</Tag></span>
                        {rowButtons("categories", { _id: c._id, name: c.name_en, name_hi: c.name_hi, products: c.products })}
                      </Flex>
                    ))}
                  </Flex>
                </Flex>
              )}
            />
          </Card>
        </Col>
      </Row>
      <Modal open={!!editing} title={editing?.kind === "brands" ? "Edit brand" : "Edit category"} okText="Save" confirmLoading={saving} onOk={saveEdit} onCancel={() => setEditing(null)} destroyOnHidden>
        <Form form={editForm} layout="vertical" onFinish={saveEdit}>
          <Form.Item label={editing?.kind === "brands" ? "Brand name" : "English"} name="name" rules={[{ required: true, message: "Enter a name" }]}><Input autoFocus /></Form.Item>
          {editing?.kind === "categories" && <Form.Item label="हिंदी" name="name_hi"><Input /></Form.Item>}
        </Form>
      </Modal>
    </>
  );
}
