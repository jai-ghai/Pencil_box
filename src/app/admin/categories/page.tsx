"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Flex, Form, Input, Modal, Select, Switch, Typography } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { CategoryCrop } from "@/components/category-crop";
import { api } from "@/lib/client";
import { can, useMe } from "@/lib/use-me";

interface Shelf {
  slug: string;
  label: string;
  nav: string;
  parent: string;
  home: boolean;
  subtitle: string;
  about: string;
  hidden: boolean;
  image: string;
  sortOrder: number;
  listing: boolean;
  products: number;
  catalogCategoryId: string;
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";

export default function CategoriesPage() {
  const { message } = App.useApp();
  const me = useMe();
  const canDelete = can(me, "products:delete");
  const [rows, setRows] = useState<Shelf[] | null>(null);
  const [editing, setEditing] = useState<Shelf | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSlug, setCropSlug] = useState("");
  const [form] = Form.useForm<{ label: string; parent?: string; subtitle?: string; about?: string; home?: boolean }>();
  const [editForm] = Form.useForm<{ label: string; parent?: string; subtitle?: string; about?: string; home?: boolean }>();
  const name = Form.useWatch("label", form) ?? "";

  const load = useCallback(async () => {
    const data = await api<{ categories: Shelf[] }>("/api/admin/shop-categories");
    setRows(data.categories);
  }, []);

  useEffect(() => {
    let live = true;
    api<{ categories: Shelf[] }>("/api/admin/shop-categories")
      .then((data) => {
        if (live) setRows(data.categories);
      })
      .catch((error: Error) => message.error(error.message));
    return () => {
      live = false;
    };
  }, [message]);

  const groups = useMemo(() => (rows ?? []).filter((row) => !row.parent), [rows]);
  const home = useMemo(() => groups.filter((row) => row.home).sort((a, b) => a.sortOrder - b.sortOrder), [groups]);

  async function run(fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      message.success(done);
      await load();
    } catch (error) {
      message.error((error as Error).message);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const values = await editForm.validateFields();
    setSaving(true);
    await run(
      () => api(`/api/admin/shop-categories/${editing.slug}`, {
        method: "PATCH",
        body: {
          label: values.label.trim(),
          parent: values.parent || "",
          subtitle: values.subtitle?.trim() ?? "",
          about: values.about?.trim() ?? "",
          home: Boolean(values.home),
        },
      }),
      "Saved",
    );
    setSaving(false);
    setEditing(null);
  }

  async function upload(slug: string, blob: Blob) {
    const body = new FormData();
    body.set("file", new File([blob], "category.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
    await api(`/api/admin/shop-categories/${slug}`, { method: "PATCH", body: { image: data.url } });
    message.success("Photo saved");
    await load();
  }

  function remove(row: Shelf) {
    const others = (rows ?? []).filter((item) => item.slug !== row.slug && item.catalogCategoryId);
    let reassignTo = "";
    Modal.confirm({
      title: `Delete ${row.label}?`,
      content: row.products > 0 ? (
        <div>
          <p>{row.products} product{row.products === 1 ? "" : "s"} use this category. Choose where they should go.</p>
          <Select
            className="mt-2 w-full"
            placeholder="Move products to"
            options={others.map((item) => ({ value: item.slug, label: item.label }))}
            onChange={(value) => {
              reassignTo = value;
            }}
          />
        </div>
      ) : (
        "The shelf leaves the shop. The drawing stays in the project."
      ),
      okText: row.products > 0 ? "Move products and delete" : "Delete",
      okButtonProps: { danger: true },
      onOk: () => run(
        () => api(`/api/admin/shop-categories/${row.slug}`, { method: "DELETE", body: reassignTo ? { reassignTo } : {} }),
        "Deleted",
      ),
    });
  }

  function rowActions(row: Shelf, scope: "home" | "child") {
    return (
      <Flex gap={4} wrap="wrap">
        <Button size="small" aria-label={`Move ${row.label} up`} onClick={() => run(() => api(`/api/admin/shop-categories/${row.slug}`, { method: "PATCH", body: { direction: "up", parent: scope === "home" ? "" : row.parent } }), "Moved")}>Up</Button>
        <Button size="small" aria-label={`Move ${row.label} down`} onClick={() => run(() => api(`/api/admin/shop-categories/${row.slug}`, { method: "PATCH", body: { direction: "down" } }), "Moved")}>Down</Button>
        <Switch
          checked={!row.hidden}
          aria-label={`Show ${row.label}`}
          onChange={(on) => run(() => api(`/api/admin/shop-categories/${row.slug}`, { method: "PATCH", body: { hidden: !on } }), on ? "Shown" : "Hidden")}
        />
        <Button size="small" icon={<EditOutlined />} aria-label={`Edit ${row.label}`} onClick={() => (editForm.setFieldsValue({ label: row.label, parent: row.parent || undefined, subtitle: row.subtitle, about: row.about, home: row.home }), setEditing(row))}>Edit</Button>
        {canDelete && <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${row.label}`} onClick={() => remove(row)} />}
      </Flex>
    );
  }

  function photo(row: Shelf) {
    return (
      <Flex align="center" gap={8}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.image || `/category/${row.slug}.svg`} alt="" width={48} height={48} className="h-12 w-12 rounded-[8px] bg-[#f0f3f8] object-contain" />
        <Button size="small" onClick={() => (setCropSlug(row.slug), document.getElementById(`file-${row.slug}`)?.click())}>Photo</Button>
        {row.image && (
          <Button size="small" onClick={() => run(() => api(`/api/admin/shop-categories/${row.slug}`, { method: "PATCH", body: { image: "" } }), "Drawing restored")}>Use drawing</Button>
        )}
        <input
          id={`file-${row.slug}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              setCropSlug(row.slug);
              setCropFile(file);
            }
          }}
        />
      </Flex>
    );
  }

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Categories</Typography.Title>
      <Typography.Paragraph type="secondary">
        These are the shelves on the shop. The name becomes the address. A photo replaces the drawing for that shelf only, and you can switch back.
      </Typography.Paragraph>
      <Card title="Add a category" className="mb-4">
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => run(async () => {
            await api("/api/admin/shop-categories", {
              body: {
                label: values.label.trim(),
                parent: values.parent || "",
                subtitle: values.subtitle?.trim() || "",
                about: values.about?.trim() || "",
                home: Boolean(values.home),
              },
            });
            form.resetFields();
          }, "Category added")}
        >
          <Flex gap={12} wrap="wrap">
            <Form.Item label="Name" name="label" rules={[{ required: true, message: "Enter a name" }]} style={{ minWidth: 200, flex: 1 }}>
              <Input placeholder="Exam pad" />
            </Form.Item>
            <Form.Item label="Address" style={{ minWidth: 180 }}>
              <Input value={name ? slugify(name) : ""} readOnly aria-label="Address" />
            </Form.Item>
            <Form.Item label="Group" name="parent" style={{ minWidth: 180 }}>
              <Select allowClear placeholder="Top level" options={groups.map((row) => ({ value: row.slug, label: row.label }))} />
            </Form.Item>
          </Flex>
          <Form.Item label="Short subtitle" name="subtitle"><Input placeholder="For the school list" /></Form.Item>
          <Form.Item label="SEO text" name="about"><Input.TextArea rows={3} placeholder="What a customer should know about this shelf" /></Form.Item>
          <Form.Item name="home" valuePropName="checked"><Switch /> Show on the home row</Form.Item>
          <Button type="primary" htmlType="submit">Add category</Button>
        </Form>
      </Card>

      <Card title="Home row" className="mb-4" loading={!rows}>
        <ul className="m-0 list-none p-0">
          {home.map((row) => (
            <li key={row.slug} className="flex flex-wrap items-center gap-3 border-t border-black/5 py-3">
              {photo(row)}
              <div className="min-w-[140px] flex-1">
                <div className="font-semibold">{row.label}{row.hidden ? " (hidden)" : ""}</div>
                <div className="text-xs text-[#5a6a82]">/{row.slug}{row.subtitle ? ` · ${row.subtitle}` : ""} · {row.products} item{row.products === 1 ? "" : "s"}</div>
              </div>
              {rowActions(row, "home")}
            </li>
          ))}
        </ul>
      </Card>

      {groups.map((group) => {
        const kids = (rows ?? []).filter((row) => row.parent === group.slug).sort((a, b) => a.sortOrder - b.sortOrder);
        if (!kids.length) return null;
        return (
          <Card key={group.slug} title={group.label} className="mb-4">
            <ul className="m-0 list-none p-0">
              {kids.map((row) => (
                <li key={row.slug} className="flex flex-wrap items-center gap-3 border-t border-black/5 py-3">
                  {photo(row)}
                  <div className="min-w-[140px] flex-1">
                    <div className="font-semibold">{row.label}{row.hidden ? " (hidden)" : ""}</div>
                    <div className="text-xs text-[#5a6a82]">/{row.slug}{row.subtitle ? ` · ${row.subtitle}` : ""} · {row.products} item{row.products === 1 ? "" : "s"}</div>
                  </div>
                  {rowActions(row, "child")}
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      <Modal open={!!editing} title={editing ? `Edit ${editing.label}` : "Edit"} okText="Save" confirmLoading={saving} onOk={saveEdit} onCancel={() => setEditing(null)} destroyOnHidden>
        <Form form={editForm} layout="vertical">
          <Form.Item label="Name" name="label" rules={[{ required: true, message: "Enter a name" }]}><Input /></Form.Item>
          <Form.Item label="Group" name="parent">
            <Select allowClear placeholder="Top level" options={groups.filter((row) => row.slug !== editing?.slug).map((row) => ({ value: row.slug, label: row.label }))} />
          </Form.Item>
          <Form.Item label="Short subtitle" name="subtitle"><Input /></Form.Item>
          <Form.Item label="SEO text" name="about"><Input.TextArea rows={5} /></Form.Item>
          <Form.Item name="home" valuePropName="checked"><Switch /> Show on the home row</Form.Item>
          {editing && <Typography.Text type="secondary">Address: /c/{editing.listing ? editing.slug : slugify(editForm.getFieldValue("label") || editing.label)}</Typography.Text>}
        </Form>
      </Modal>

      <CategoryCrop
        file={cropFile}
        onCancel={() => setCropFile(null)}
        onCropped={(blob) => {
          const slug = cropSlug;
          setCropFile(null);
          upload(slug, blob).catch((error: Error) => message.error(error.message));
        }}
      />
    </>
  );
}
