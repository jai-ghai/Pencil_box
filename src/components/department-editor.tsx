"use client";

import { useEffect, useState } from "react";
import { App, Button, Card, Flex, Input, Switch, Typography } from "antd";
import { api } from "@/lib/client";
import { DEPARTMENTS, HOME_LINKS, PARENT_LABEL, type DepartmentPrefs } from "@/lib/departments";

/** Reorder the home row, hide a shelf, or set a photo URL. Empty shelves stay listed here. */
export function DepartmentEditor() {
  const { message } = App.useApp();
  const [prefs, setPrefs] = useState<DepartmentPrefs | null>(null);
  useEffect(() => {
    api<DepartmentPrefs>("/api/admin/departments").then(setPrefs).catch((e: Error) => message.error(e.message));
  }, [message]);
  if (!prefs) return null;
  const hidden = new Set(prefs.hidden);
  const order = prefs.order.length ? prefs.order : HOME_LINKS.map((h) => h.slug);
  function save(next: DepartmentPrefs) {
    setPrefs(next);
    api<DepartmentPrefs>("/api/admin/departments", { method: "PUT", body: next })
      .then((saved) => (setPrefs(saved), message.success("Saved")))
      .catch((e: Error) => message.error(e.message));
  }
  function move(slug: string, dir: -1 | 1) {
    const list = [...order];
    const i = list.indexOf(slug);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    save({ ...prefs!, order: list });
  }
  return (
    <Card title="Departments" className="mb-4">
      <Typography.Paragraph type="secondary">
        Hide a shelf from the shop, change the home order, or paste a photo URL. Empty shelves stay in this list. The bill does not use this.
      </Typography.Paragraph>
      <Typography.Text strong>Home order</Typography.Text>
      <ul className="m-0 list-none p-0">
        {order.map((slug) => {
          const label = HOME_LINKS.find((h) => h.slug === slug)?.label ?? slug;
          return (
            <li key={slug} className="flex items-center gap-2 py-1">
              <span className="min-w-0 flex-1">{label}</span>
              <Button size="small" aria-label={`Move ${label} up`} onClick={() => move(slug, -1)}>Up</Button>
              <Button size="small" aria-label={`Move ${label} down`} onClick={() => move(slug, 1)}>Down</Button>
            </li>
          );
        })}
      </ul>
      <Typography.Text strong className="mt-3 block">All shelves</Typography.Text>
      <ul className="m-0 list-none p-0">
        {DEPARTMENTS.map((d) => (
          <li key={d.slug} className="flex flex-wrap items-center gap-2 border-t border-black/5 py-2">
            <span className="min-w-[140px] font-semibold">{d.label}</span>
            <span className="text-xs text-[#5a6a82]">{d.parent ? PARENT_LABEL[d.parent] : "Main"}</span>
            <Flex align="center" gap={6}>
              <Switch
                checked={!hidden.has(d.slug)}
                aria-label={`Show ${d.label}`}
                onChange={(on) => save({ ...prefs, hidden: on ? prefs.hidden.filter((s) => s !== d.slug) : [...prefs.hidden, d.slug] })}
              />
              <span className="text-xs">Show</span>
            </Flex>
            <Input
              aria-label={`${d.label} photo URL`}
              placeholder="https:// photo (optional)"
              defaultValue={prefs.images[d.slug] ?? ""}
              onBlur={(e) => save({ ...prefs, images: { ...prefs.images, [d.slug]: e.target.value.trim() } })}
              style={{ maxWidth: 280 }}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
