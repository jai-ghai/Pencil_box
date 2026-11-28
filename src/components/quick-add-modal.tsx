"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, App, Button, Flex, Input, Modal, Typography } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import { ShopImage } from "@/components/shop-image";
import { api } from "@/lib/client";
import { parseQuickAdd } from "@/lib/quick-add";

export interface QuickAddSeed {
  /** pre-filled line, e.g. request name — add a price before saving */
  line?: string;
  imageUrl?: string | null;
  /** when set, saving marks that customer request as in stock (drops off the open list) */
  requestId?: string;
}

/**
 * Shared "one line + photo" product create. Used from Products, Requests and the Daily book.
 */
export function QuickAddModal({
  open,
  brands,
  seed,
  onClose,
  onSaved,
}: {
  open: boolean;
  brands: string[];
  seed?: QuickAddSeed | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  return (
    <Modal open={open} title={seed?.requestId ? "Add requested item to shop" : "Quick add"} onCancel={onClose} destroyOnHidden footer={null}>
      <QuickAddForm key={`${seed?.requestId ?? ""}-${seed?.line ?? ""}-${open}`} brands={brands} seed={seed} onSaved={onSaved} />
    </Modal>
  );
}

function QuickAddForm({ brands, seed, onSaved }: { brands: string[]; seed?: QuickAddSeed | null; onSaved: () => void | Promise<void> }) {
  const { message, modal } = App.useApp();
  const [line, setLine] = useState(seed?.line ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(seed?.imageUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draft = parseQuickAdd(line, brands);

  useEffect(() => {
    const apply = setTimeout(() => {
      setLine(seed?.line ?? "");
      setImageUrl(seed?.imageUrl ?? null);
    }, 0);
    return () => clearTimeout(apply);
  }, [seed?.line, seed?.imageUrl]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Upload failed");
      setImageUrl((data as { url: string }).url);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(acknowledgeSamePrice = false) {
    if (!draft) {
      message.warning("Type a name and a price, e.g. Natraj HB pencil 5");
      return;
    }
    if (draft.price === undefined) {
      message.warning("Add a price at the end, e.g. Natraj HB pencil 5");
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ product: { name_en: string }; variants: { shortCode?: string }[]; requestCleared?: boolean }>("/api/admin/products/quick", {
        body: { line, imageUrl: imageUrl ?? undefined, requestId: seed?.requestId, acknowledgeSamePrice },
      });
      const code = r.variants[0]?.shortCode?.toUpperCase();
      message.success(
        `Added "${r.product.name_en}"${code ? ` (${code})` : ""}.${r.requestCleared ? " Request dropped from the open list." : ""}`,
      );
      await onSaved();
    } catch (e) {
      const text = (e as Error).message;
      if (text.startsWith("Same price:")) {
        modal.confirm({
          title: "Same price already in this category",
          content: text,
          okText: "Save anyway",
          onOk: () => save(true),
        });
      } else message.error(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Flex vertical gap={12}>
      <Typography.Paragraph style={{ margin: 0 }}>
        {seed?.requestId
          ? "Add the sell price at the end (e.g. \"… 25\"), then Save. The request leaves the open list."
          : "Type name and price. Brand and category are guessed; you can tidy them up later."}
      </Typography.Paragraph>
      <Input
        size="large"
        autoFocus
        placeholder="Natraj HB pencil 5"
        value={line}
        onChange={(e) => setLine(e.target.value)}
        onPressEnter={() => save()}
        aria-label="Quick add line"
      />
      {draft && (
        <Alert
          type="info"
          showIcon
          title="Will save as"
          description={
            <span>
              {draft.brand && (
                <>
                  <strong>{draft.brand}</strong> ·{" "}
                </>
              )}
              {draft.name}
              {draft.price !== undefined && <> · ₹{draft.price}</>}
              {draft.categoryHint && <> · category like &quot;{draft.categoryHint}&quot;</>}
            </span>
          }
        />
      )}
      <Flex gap={8} align="center" wrap>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden aria-hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
        <Button icon={<CameraOutlined />} loading={uploading} onClick={() => fileRef.current?.click()}>
          {imageUrl ? "Change photo" : "Add photo"}
        </Button>
        {imageUrl && (
          <span className="block w-12 shrink-0 overflow-hidden rounded-[8px]"><ShopImage src={imageUrl} alt="Product" width={96} sizes="48px" /></span>
        )}
        <Button type="primary" size="large" loading={busy} disabled={!draft || draft.price === undefined} onClick={() => save()} style={{ marginLeft: "auto" }}>
          Save now
        </Button>
      </Flex>
    </Flex>
  );
}
