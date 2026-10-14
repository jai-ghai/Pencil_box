"use client";

import { useState } from "react";
import { Alert, Button, Card, Flex, Input, Typography, Upload } from "antd";
import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import { SimpleList } from "@/components/simple-list";

const SAMPLE = `name_en,name_hi,brand,category,label,sell_price,cost_price,pack_size,opening_stock,short_code,aliases,image_url
Classic Pencil,क्लासिक पेंसिल,Doms,Pencils,HB,5,3.5,10,100,,dom pencil|doms hb,
Classic Pencil,क्लासिक पेंसिल,Doms,Pencils,2B,6,4,10,50,,,
Notebook,नोटबुक,Classmate,Notebooks,172 pages,40,30,12,36,,,
Toy Car,खिलौना कार,Funskool,Toys,Red,150,100,1,6,,,`;

interface Result { created: number; skipped: number; errors: { line: number; message: string }[] }

export default function ImportPage() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const r = await fetch("/api/admin/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Import failed");
      setRes(d);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" }));
    a.download = "pencilbox-import-template.csv";
    a.click();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>Import products from CSV</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        Add many items at once from a spreadsheet saved as CSV. Rows with the same name and brand become one product with several variants (HB, 2B…). Prices are in rupees. Missing brands and categories are created, item codes are generated automatically, and importing the same file again does not create duplicates. Add photos afterwards on the Products page.
      </Typography.Paragraph>
      <Flex gap={8} wrap>
        <Button icon={<DownloadOutlined />} onClick={download}>Download template</Button>
        <Button onClick={() => setText(SAMPLE)}>Fill with example</Button>
      </Flex>
      <Upload.Dragger accept=".csv,text/csv" maxCount={1} showUploadList={false} beforeUpload={async (f) => { setText(await f.text()); return false; }}>
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Drop a CSV file here, or click to choose one</p>
      </Upload.Dragger>
      <Input.TextArea value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="…or paste the CSV text here" aria-label="CSV contents" style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12 }} />
      <Button type="primary" disabled={!text.trim()} loading={busy} onClick={run} style={{ alignSelf: "flex-start" }}>Import</Button>
      {err && <Alert type="error" showIcon title={err} />}
      {res && (
        <Card>
          <Alert type="success" showIcon title={`${res.created} products added · ${res.skipped} already existed`} />
          {res.errors.length > 0 && (
            <SimpleList
              className="mt-4"
              header={<Typography.Text type="danger" strong>{res.errors.length} rows had problems</Typography.Text>}
              dataSource={res.errors.slice(0, 30)}
              renderItem={(e) => <>Line {e.line}: {e.message}</>}
            />
          )}
        </Card>
      )}
    </div>
  );
}
