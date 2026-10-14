"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Col, Drawer, Empty, Flex, Form, Grid, Image, Input, InputNumber, Row, Select, Switch, Table, Tag, Typography, Upload } from "antd";
import type { TableColumnsType, UploadFile } from "antd";
import { CopyOutlined, DeleteOutlined, PictureOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { api, inr } from "@/lib/client";

interface Opt { _id: string; name?: string; name_en?: string; parentId?: string | null }
interface VariantDoc { _id: string; label: string; shortCode?: string; sellPrice: number; costPrice: number; packSize: number; reorderLevel: number; quickTap: boolean; trackStock?: boolean; stockOnHand: number }
interface ProductDoc {
  _id: string;
  name_en: string;
  name_hi?: string;
  brandId?: { _id: string; name: string } | null;
  categoryId?: { _id: string; name_en: string } | null;
  supplierId?: string;
  internalNote?: string;
  imageGeneric?: boolean;
  imageSource?: string;
  images: string[];
  variants: VariantDoc[];
}
interface VariantForm {
  _id?: string;
  label?: string;
  shortCode?: string;
  sellPrice?: number;
  costPrice?: number;
  packSize?: number;
  reorderLevel?: number;
  openingStock?: number;
  quickTap?: boolean;
  trackStock?: boolean;
  stockOnHand?: number;
}
interface ProductForm {
  name_en: string;
  name_hi?: string;
  brandId?: string;
  categoryId?: string;
  supplierId?: string;
  internalNote?: string;
  variants: VariantForm[];
}

const blankVariant = (): VariantForm => ({ label: "", sellPrice: undefined, costPrice: 0, packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true });

export default function Products() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const [form] = Form.useForm<ProductForm>();
  const [brands, setBrands] = useState<Opt[]>([]);
  const [cats, setCats] = useState<Opt[]>([]);
  const [suppliers, setSuppliers] = useState<Opt[]>([]);
  const [list, setList] = useState<ProductDoc[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // product id, or "new"
  const [images, setImages] = useState<string[]>([]);
  const [generic, setGeneric] = useState(false); // the picture is a stand-in from the internet
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async (search = "") => {
    const d = await api<{ products: ProductDoc[] }>(`/api/admin/products?q=${encodeURIComponent(search)}`);
    setList(d.products);
  }, []);

  useEffect(() => {
    Promise.all([api<{ brands: Opt[] }>("/api/admin/brands"), api<{ categories: Opt[] }>("/api/admin/categories"), api<{ suppliers: Opt[] }>("/api/admin/suppliers"), api<{ products: ProductDoc[] }>("/api/admin/products")])
      .then(([b, c, s, p]) => (setBrands(b.brands), setCats(c.categories), setSuppliers(s.suppliers), setList(p.products)))
      .catch((e: Error) => message.error(e.message));
  }, [message]);

  /* categories grouped under their parent; a parent with no children can be chosen itself */
  const categoryOptions = useMemo(() => {
    const tops = cats.filter((c) => !c.parentId);
    return tops.map((t) => {
      const kids = cats.filter((c) => c.parentId === t._id);
      return kids.length ? { label: t.name_en, options: kids.map((k) => ({ value: k._id, label: k.name_en })) } : { label: t.name_en, options: [{ value: t._id, label: t.name_en }] };
    });
  }, [cats]);

  function startNew() {
    form.resetFields();
    form.setFieldsValue({ variants: [blankVariant()] });
    setImages([]);
    setGeneric(false);
    setEditing("new");
  }
  function startEdit(p: ProductDoc) {
    form.resetFields();
    form.setFieldsValue({
      name_en: p.name_en,
      name_hi: p.name_hi,
      brandId: p.brandId?._id,
      categoryId: p.categoryId?._id,
      supplierId: p.supplierId ? String(p.supplierId) : undefined,
      internalNote: p.internalNote,
      variants: p.variants.map((v) => ({ _id: v._id, label: v.label, shortCode: v.shortCode, sellPrice: v.sellPrice / 100, costPrice: v.costPrice / 100, packSize: v.packSize, reorderLevel: v.reorderLevel, quickTap: v.quickTap, trackStock: v.trackStock !== false, stockOnHand: v.stockOnHand })),
    });
    setImages(p.images);
    setGeneric(!!p.imageGeneric);
    setEditing(p._id);
  }

  async function save(v: ProductForm) {
    setSaving(true);
    try {
      const body = {
        name_en: v.name_en.trim(),
        name_hi: v.name_hi?.trim() || undefined,
        brandId: v.brandId || undefined,
        categoryId: v.categoryId,
        supplierId: v.supplierId || undefined,
        internalNote: v.internalNote?.trim() || undefined,
        images,
        imageGeneric: images.length > 0 && generic,
        variants: v.variants.map((x) => ({
          _id: x._id,
          label: (x.label ?? "").trim(),
          shortCode: x._id ? undefined : x.shortCode?.trim() || undefined, // existing codes never change
          sellPrice: x.sellPrice ?? 0,
          costPrice: x.costPrice ?? 0,
          packSize: Math.max(1, Math.round(x.packSize ?? 1)),
          reorderLevel: Math.round(x.reorderLevel ?? 0),
          quickTap: !!x.quickTap,
          trackStock: x.trackStock !== false,
          openingStock: !x._id && x.openingStock ? Math.round(x.openingStock) : undefined,
        })),
      };
      if (editing === "new") await api("/api/admin/products", { body });
      else await api(`/api/admin/products/${editing}`, { method: "PATCH", body });
      message.success(`Saved "${body.name_en}"`);
      setEditing(null);
      await loadList(q);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fileList: UploadFile[] = images.map((url) => ({ uid: url, name: url.split("/").pop() ?? "photo", status: "done", url }));

  const columns: TableColumnsType<ProductDoc> = [
    {
      title: "Product",
      key: "p",
      render: (_: unknown, p) => (
        <Flex gap={12} align="center">
          {p.images[0] ? <Image src={p.images[0]} alt="" width={44} height={44} style={{ objectFit: "cover", borderRadius: 8 }} /> : <Flex align="center" justify="center" style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(255,213,0,0.18)" }}><PictureOutlined style={{ opacity: 0.45 }} /></Flex>}
          <div>
            <div style={{ fontWeight: 600 }}>{p.name_en}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.brandId?.name ?? "No brand"}{p.name_hi ? ` · ${p.name_hi}` : ""}</Typography.Text>
            {p.internalNote && <div><Tag color="gold" style={{ marginTop: 4, whiteSpace: "normal" }}>Note: {p.internalNote}</Tag></div>}
          </div>
        </Flex>
      ),
    },
    { title: "Category", key: "c", responsive: ["md"], render: (_: unknown, p) => p.categoryId?.name_en },
    {
      title: "Variants",
      key: "v",
      render: (_: unknown, p) => (
        <div style={{ fontSize: 13 }}>
          {p.variants.map((v) => (
            <div key={v._id}>
              <Typography.Text code>{(v.shortCode ?? "").toUpperCase()}</Typography.Text> {v.label || "—"} · {inr(v.sellPrice)} ·{" "}
              {v.trackStock === false ? <Tag>service</Tag> : <Typography.Text type={v.reorderLevel > 0 && v.stockOnHand <= v.reorderLevel ? "danger" : "secondary"}>stock {v.stockOnHand}</Typography.Text>}
            </div>
          ))}
        </div>
      ),
    },
    { title: "", key: "a", width: 80, render: (_: unknown, p) => <Button onClick={() => startEdit(p)}>Edit</Button> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={12} wrap>
        <Typography.Title level={3} style={{ margin: 0 }}>Products</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={startNew}>Add product</Button>
      </Flex>
      <Input.Search placeholder="Search products" allowClear enterButton={<SearchOutlined />} value={q} onChange={(e) => setQ(e.target.value)} onSearch={(v) => loadList(v)} style={{ maxWidth: 420 }} />
      <Card styles={{ body: { padding: 0 } }}>
        <Table<ProductDoc> rowKey="_id" size="middle" loading={!list} columns={columns} dataSource={list ?? []} pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No products yet. Add one or import a CSV." /> }} />
      </Card>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New product" : "Edit product"}
        size={screens.md ? 860 : "100%"}
        destroyOnHidden={false}
        extra={<Flex gap={8}><Button onClick={() => setEditing(null)}>Cancel</Button><Button type="primary" loading={saving} onClick={() => form.submit()}>Save product</Button></Flex>}
      >
        {cats.length === 0 && <Alert type="warning" showIcon title="Add a category first (Setup page)." style={{ marginBottom: 16 }} />}
        <Form<ProductForm> form={form} layout="vertical" onFinish={save} requiredMark disabled={saving}>
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item label="Name (English)" name="name_en" rules={[{ required: true, message: "Enter a name" }]}><Input placeholder="Classic Pencil" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="नाम (हिंदी)" name="name_hi"><Input /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Brand" name="brandId"><Select allowClear showSearch={{ optionFilterProp: "label" }} placeholder="No brand" options={brands.map((b) => ({ value: b._id, label: b.name }))} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Category" name="categoryId" rules={[{ required: true, message: "Choose a category" }]}><Select showSearch={{ optionFilterProp: "label" }} placeholder="Choose" options={categoryOptions} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Supplier" name="supplierId"><Select allowClear placeholder="None" options={suppliers.map((s) => ({ value: s._id, label: s.name }))} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item label="Private note (only you see this)" name="internalNote"><Input maxLength={500} /></Form.Item></Col>
          </Row>

          {generic && <Alert type="info" showIcon style={{ marginBottom: 12 }} title="This is a general picture from the internet (free licence), not your exact item. The website labels it 'for illustration'. Upload your own photo to replace it." />}
          <Form.Item label="Photos (JPG, PNG or WebP, up to 5 MB)" extra="Photos appear on the website. Until you add one, the card shows an empty picture block.">
            <Upload
              listType="picture-card"
              accept="image/jpeg,image/png,image/webp"
              multiple
              maxCount={8}
              fileList={fileList}
              beforeUpload={(f) => (f.size > 5 * 1024 * 1024 ? (message.error("That image is larger than 5 MB"), Upload.LIST_IGNORE) : true)}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const fd = new FormData();
                  fd.set("file", file as File);
                  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "Upload failed");
                  setImages((im) => [...im, data.url]);
                  setGeneric(false); // your own photo replaces the stand-in
                  onSuccess?.(data);
                } catch (e) {
                  message.error((e as Error).message);
                  onError?.(e as Error);
                }
              }}
              onRemove={(f) => (setImages((im) => im.filter((u) => u !== f.url)), setGeneric(false))}
            >
              {images.length < 8 && <div><PlusOutlined /><div style={{ marginTop: 6 }}>Photo</div></div>}
            </Upload>
          </Form.Item>

          <Typography.Title level={5}>Variants</Typography.Title>
          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <Flex vertical gap={12}>
                {fields.map((f) => {
                  const existing = !!form.getFieldValue(["variants", f.name, "_id"]);
                  return (
                    <Card key={f.key} size="small">
                      <Form.Item name={[f.name, "_id"]} hidden><Input /></Form.Item>
                      <Row gutter={12}>
                        <Col xs={24} sm={10}><Form.Item label="Variant (e.g. HB, Blue)" name={[f.name, "label"]}><Input /></Form.Item></Col>
                        <Col xs={12} sm={6}><Form.Item label="Item code" name={[f.name, "shortCode"]} extra={existing ? undefined : "Blank = automatic"}><Input disabled={existing} placeholder="auto" /></Form.Item></Col>
                        <Col xs={12} sm={4}><Form.Item label="Sell ₹" name={[f.name, "sellPrice"]} rules={[{ required: true, message: "Price?" }]}><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
                        <Col xs={12} sm={4}><Form.Item label="Cost ₹ each" name={[f.name, "costPrice"]}><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
                        <Col xs={12} sm={5}><Form.Item label="Pieces per box" name={[f.name, "packSize"]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                        <Col xs={12} sm={5}><Form.Item label="Reorder at" name={[f.name, "reorderLevel"]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item></Col>
                        <Col xs={12} sm={5}>
                          {existing ? (
                            <Form.Item label="In stock"><Typography.Text strong>{form.getFieldValue(["variants", f.name, "stockOnHand"])}</Typography.Text><div><Typography.Text type="secondary" style={{ fontSize: 12 }}>Change it on the Stock page</Typography.Text></div></Form.Item>
                          ) : (
                            <Form.Item label="Stock now" name={[f.name, "openingStock"]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                          )}
                        </Col>
                        <Col xs={12} sm={4}><Form.Item label="Quick item" name={[f.name, "quickTap"]} valuePropName="checked" extra="On billing screen"><Switch /></Form.Item></Col>
                        <Col xs={12} sm={5}><Form.Item label="Count stock" name={[f.name, "trackStock"]} valuePropName="checked" extra="Off for services"><Switch /></Form.Item></Col>
                      </Row>
                      <Flex gap={8} justify="flex-end">
                        <Button size="small" icon={<CopyOutlined />} onClick={() => { const v = form.getFieldValue(["variants", f.name]) as VariantForm; add({ ...v, _id: undefined, label: "", shortCode: undefined, openingStock: undefined, stockOnHand: undefined }); }}>Duplicate</Button>
                        {!existing && fields.length > 1 && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(f.name)}>Remove</Button>}
                      </Flex>
                    </Card>
                  );
                })}
                <Button icon={<PlusOutlined />} onClick={() => add(blankVariant())} style={{ alignSelf: "flex-start" }}>Add variant</Button>
              </Flex>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </div>
  );
}
