"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "antd";

/**
 * Square crop. Drag the photo inside the frame, then the result is uploaded
 * in place of the built-in drawing.
 */
export function CategoryCrop({
  file,
  onCancel,
  onCropped,
}: {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [url, setUrl] = useState("");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const frame = 280;

  useEffect(() => {
    if (!file) {
      const clear = setTimeout(() => setUrl(""), 0);
      return () => clearTimeout(clear);
    }
    const next = URL.createObjectURL(file);
    const show = setTimeout(() => {
      setUrl(next);
      setOffset({ x: 0, y: 0 });
    }, 0);
    return () => {
      clearTimeout(show);
      URL.revokeObjectURL(next);
    };
  }, [file]);

  async function confirm() {
    if (!url) return;
    const image = new Image();
    image.src = url;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const scale = Math.max(frame / image.naturalWidth, frame / image.naturalHeight);
    const drawnW = image.naturalWidth * scale;
    const drawnH = image.naturalHeight * scale;
    const left = (frame - drawnW) / 2 + offset.x;
    const top = (frame - drawnH) / 2 + offset.y;
    const sx = Math.max(0, Math.min(image.naturalWidth - side, (0 - left) / scale));
    const sy = Math.max(0, Math.min(image.naturalHeight - side, (0 - top) / scale));
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 800);
    ctx.drawImage(image, sx, sy, side, side, 0, 0, 800, 800);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob) onCropped(blob);
  }

  return (
    <Modal open={!!file} title="Crop to a square" okText="Use this photo" onOk={confirm} onCancel={onCancel} destroyOnHidden>
      <p className="mb-3 text-sm text-[#5a6a82]">Drag the photo so the part you want sits in the square.</p>
      <div
        className="mx-auto overflow-hidden rounded-[12px] bg-[#f0f3f8]"
        style={{ width: frame, height: frame, touchAction: "none", cursor: "grab" }}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setOffset({
            x: drag.current.ox + event.clientX - drag.current.x,
            y: drag.current.oy + event.clientY - drag.current.y,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              width: frame,
              height: frame,
              objectFit: "cover",
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}
      </div>
      <Button className="mt-3" onClick={() => setOffset({ x: 0, y: 0 })}>Centre</Button>
    </Modal>
  );
}
