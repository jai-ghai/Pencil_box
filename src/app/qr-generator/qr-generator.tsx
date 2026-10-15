"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Col, Flex, Input, Radio, Row, Select, Table, Typography } from "antd";
import { CopyOutlined, DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import { api } from "@/lib/client";
import { plainQrSvg, posterSvg, POSTER_H, POSTER_W } from "@/lib/qr";
import { downloadBlob, downloadSvg, printSvg, svgToPngBlob } from "@/lib/qr-browser";

interface Settings {
  qrTarget: string;
  siteOrigin: string;
}
interface Stat {
  src: string;
  today: number;
  week: number;
  total: number;
}
const BASE = [
  { key: "front", title: "Shop front" },
  { key: "counter", title: "Counter" },
  { key: "bag", title: "Carry bag" },
  { key: "bill", title: "Bill / receipt" },
];
const SUGGESTED_ORIGIN = "https://pencilbox.store";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);

export function QrGenerator() {
  const { message } = App.useApp();
  const [saved, setSaved] = useState<Settings | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [originDraft, setOriginDraft] = useState(SUGGESTED_ORIGIN);
  const [targetMode, setTargetMode] = useState<"home" | "custom">("home");
  const [targetDraft, setTargetDraft] = useState("");
  const [extra, setExtra] = useState<{ key: string; title: string }[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [posterKey, setPosterKey] = useState("front");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    Promise.all([api<Settings>("/api/admin/settings"), api<{ rows: Stat[] }>("/api/admin/qr-stats")])
      .then(([s, st]) => {
        setSaved(s);
        setOriginDraft(s.siteOrigin || SUGGESTED_ORIGIN);
        setTargetMode(s.qrTarget === "/" ? "home" : "custom");
        setTargetDraft(s.qrTarget === "/" ? "" : s.qrTarget);
        setStats(st.rows);
      })
      .catch((e: Error) => message.error(e.message));
  }, [message]);

  const origin = originDraft.trim().replace(/\/+$/, "");
  const goodOrigin = /^https:\/\/[^/\s]+$/.test(origin);
  const placements = [...BASE, ...extra];
  const urlFor = (key: string) => `${origin}/q?src=${key}`;

  async function save(patch: Partial<Settings>, done: string) {
    try {
      setSaved(await api<Settings>("/api/admin/settings", { method: "PUT", body: patch }));
      message.success(done);
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  async function png(svg: string, w: number, h: number, name: string) {
    try {
      downloadBlob(await svgToPngBlob(svg, w, h), name);
    } catch (e) {
      message.error((e as Error).message);
    }
  }

  const posterUrl = urlFor(posterKey);
  const poster = useMemo(() => (goodOrigin ? posterSvg(posterUrl, { phone: phone.trim() || undefined }) : ""), [goodOrigin, posterUrl, phone]);

  return (
    <div className="flex max-w-6xl flex-col gap-4">
      <Typography.Title level={3} style={{ margin: 0 }}>QR generator</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        Make QR codes to print and stick up. Every QR opens <b>your website address + /q</b>, and /q sends people wherever you choose below (the homepage by default). You can change that destination at any time without reprinting anything.
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="1. Your website address" style={{ height: "100%" }}>
            <Typography.Paragraph type="secondary">The public address of the shop website. It is printed inside the QR, so use the final one.</Typography.Paragraph>
            <Flex gap={8} wrap>
              <Input value={originDraft} onChange={(e) => setOriginDraft(e.target.value)} placeholder="https://pencilbox.store" style={{ flex: 1, minWidth: 220 }} aria-label="Website address" />
              <Button onClick={() => save({ siteOrigin: origin }, "Website address saved")} disabled={!goodOrigin || origin === saved?.siteOrigin}>Save</Button>
            </Flex>
            {!goodOrigin && <Alert type="error" showIcon style={{ marginTop: 12 }} title="Start with https:// and use only the address, like https://pencilbox.store" />}
            {goodOrigin && /localhost|127\./.test(origin) && <Alert type="warning" showIcon style={{ marginTop: 12 }} title="This address only works on this computer. Do not print it." />}
            {goodOrigin && !saved?.siteOrigin && <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>Not saved yet. Press Save once it is correct.</Typography.Paragraph>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="2. Where should the QR open?" style={{ height: "100%" }}>
            <Radio.Group value={targetMode} onChange={(e) => setTargetMode(e.target.value)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Radio value="home">The homepage (all products)</Radio>
              <Radio value="custom">A different page or link</Radio>
            </Radio.Group>
            {targetMode === "custom" && (
              <Input value={targetDraft} onChange={(e) => setTargetDraft(e.target.value)} placeholder="/ or https://wa.me/… or any https:// link" style={{ marginTop: 12 }} aria-label="Where the QR opens" />
            )}
            <Flex align="center" gap={12} style={{ marginTop: 12 }} wrap>
              <Button type="primary" onClick={() => save({ qrTarget: targetMode === "home" ? "/" : targetDraft }, "Saved. Every printed QR now opens this.")} disabled={targetMode === "custom" && !targetDraft.trim()}>Save destination</Button>
              <Typography.Text type="secondary">Now: <b>{saved?.qrTarget ?? "…"}</b></Typography.Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      <Card title="3. QR codes to download">
        {!goodOrigin ? (
          <Alert type="info" showIcon title="Enter your website address above to see the QR codes." />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {placements.map((p) => {
                const url = urlFor(p.key);
                const svg = plainQrSvg(url);
                return (
                  <Col key={p.key} xs={24} sm={12} md={8} xl={6}>
                    <Card size="small" styles={{ body: { padding: 12 } }}>
                      <div role="img" aria-label={`QR code for ${p.title}`} style={{ width: "100%", maxWidth: 200, margin: "0 auto", lineHeight: 0, border: "1px solid rgba(128,128,128,0.25)", borderRadius: 10, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg width="100%" ') }} />
                      <Typography.Title level={5} style={{ margin: "12px 0 2px" }}>{p.title}</Typography.Title>
                      <Typography.Text type="secondary" style={{ fontSize: 12, wordBreak: "break-all", display: "block" }}>{url}</Typography.Text>
                      <Flex gap={6} wrap style={{ marginTop: 10 }}>
                        <Button size="small" type="primary" icon={<DownloadOutlined />} onClick={() => png(svg, 1600, 1600, `qr-${p.key}.png`)}>PNG</Button>
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadSvg(svg, `qr-${p.key}.svg`)}>SVG</Button>
                        <Button size="small" icon={<PrinterOutlined />} onClick={() => !printSvg(svg, `QR ${p.title}`, { widthMm: 100, heightMm: 100 }) && message.error("Allow pop-ups to print")}>Print</Button>
                        <Button size="small" icon={<CopyOutlined />} aria-label={`Copy link for ${p.title}`} onClick={() => navigator.clipboard?.writeText(url).then(() => message.success("Link copied"))} />
                      </Flex>
                    </Card>
                  </Col>
                );
              })}
            </Row>
            <Flex gap={8} wrap style={{ marginTop: 16 }} align="center">
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Another place, e.g. School flyer" style={{ maxWidth: 280 }} aria-label="New placement name" />
              <Button
                disabled={!slug(newLabel) || placements.some((p) => p.key === slug(newLabel))}
                onClick={() => (setExtra((x) => [...x, { key: slug(newLabel), title: newLabel.trim() }]), setNewLabel(""))}
              >
                Add QR
              </Button>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>Each place gets its own tag, so the table below shows which one people actually scan.</Typography.Text>
            </Flex>
          </>
        )}
      </Card>

      <Card title="4. Poster to print (A4)">
        {!goodOrigin ? (
          <Alert type="info" showIcon title="Enter your website address above to see the poster." />
        ) : (
          <Row gutter={[24, 16]}>
            <Col xs={24} md={9}>
              <div role="img" aria-label="Poster preview" style={{ width: "100%", maxWidth: 300, lineHeight: 0, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }} dangerouslySetInnerHTML={{ __html: poster.replace("<svg ", '<svg width="100%" ') }} />
            </Col>
            <Col xs={24} md={15}>
              <Flex vertical gap={12}>
                <div>
                  <label htmlFor="posterSrc" style={{ fontSize: 13 }}>Which place is this poster for?</label>
                  <Select id="posterSrc" value={posterKey} onChange={setPosterKey} options={placements.map((p) => ({ value: p.key, label: p.title }))} style={{ width: "100%" }} />
                </div>
                <div>
                  <label htmlFor="phone" style={{ fontSize: 13 }}>Phone number to print on the poster (optional, not saved)</label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Leave empty for none" maxLength={20} />
                </div>
                <Flex gap={8} wrap>
                  <Button type="primary" icon={<DownloadOutlined />} onClick={() => png(poster, 2480, Math.round((2480 * POSTER_H) / POSTER_W), `poster-${posterKey}-A4.png`)}>Download PNG (A4)</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => downloadSvg(poster, `poster-${posterKey}-A4.svg`)}>Download SVG</Button>
                  <Button icon={<PrinterOutlined />} onClick={() => !printSvg(poster, "Pencil Box poster") && message.error("Allow pop-ups to print")}>Print</Button>
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>Print on A4 at 100%, no margins. Test-scan the printed poster with a phone before putting it up.</Typography.Text>
              </Flex>
            </Col>
          </Row>
        )}
      </Card>

      <Card title="How often each QR is scanned" styles={{ body: { padding: 0 } }}>
        <Table<Stat>
          rowKey="src"
          size="small"
          pagination={false}
          dataSource={stats}
          locale={{ emptyText: "No scans yet. Counts appear here once people scan a printed QR." }}
          columns={[
            { title: "Place", dataIndex: "src", render: (s: string) => placements.find((p) => p.key === s)?.title ?? s },
            { title: "Today", dataIndex: "today", align: "right" },
            { title: "Last 7 days", dataIndex: "week", align: "right" },
            { title: "Total", dataIndex: "total", align: "right" },
          ]}
        />
      </Card>
    </div>
  );
}
