"use client";

/** Tiny fetch helper for the staff screens. Throws Error(message) on non-2xx. */
export async function api<T = unknown>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("Please sign in");
  }
  if (!res.ok) {
    const issues = (data as { issues?: { path: string; message: string }[] }).issues;
    const detail = issues?.length ? `: ${issues.map((i) => `${i.path} ${i.message}`).join(", ")}` : "";
    throw new Error(((data as { error?: string }).error ?? "Request failed") + detail);
  }
  return data as T;
}

export const inr = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** "Brand Product Label", without repeating the brand when the product name already starts with it. */
export const itemTitle = (i: { brand?: string; name: string; label?: string }) =>
  [i.brand && !i.name.toLowerCase().startsWith(i.brand.toLowerCase()) ? i.brand : "", i.name, i.label].filter(Boolean).join(" ");
