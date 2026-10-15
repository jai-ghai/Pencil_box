/**
 * Roles and page permissions. Safe to import from the browser: no server code in here.
 *
 *  - superadmin: everything, and the only one who manages users and permissions
 *  - admin: only the pages and actions the super admin has switched on for them
 *  - cashier: billing screen only (plus today's bills)
 */
export type Role = "superadmin" | "admin" | "cashier";

export const PAGE_PERMS = [
  { key: "dashboard", label: "Dashboard", href: "/admin" },
  { key: "orders", label: "Orders", href: "/admin/orders" },
  { key: "reports", label: "Reports", href: "/admin/reports" },
  { key: "products", label: "Products", href: "/admin/products" },
  { key: "stock", label: "Stock", href: "/admin/stock" },
  { key: "purchases", label: "Purchases", href: "/admin/purchases" },
  { key: "offers", label: "Offers", href: "/admin/offers" },
  { key: "import", label: "Import", href: "/admin/import" },
  { key: "setup", label: "Brands & categories", href: "/admin/setup" },
  { key: "qr", label: "QR generator", href: "/qr-generator" },
] as const;

export const ACTION_PERMS = [
  { key: "orders:edit", label: "Edit bills" },
  { key: "orders:delete", label: "Delete bills" },
  { key: "products:delete", label: "Archive and restore products" },
] as const;

export type PagePerm = (typeof PAGE_PERMS)[number]["key"];
export type Perm = PagePerm | (typeof ACTION_PERMS)[number]["key"];

export const ALL_PERMS: Perm[] = [...PAGE_PERMS.map((p) => p.key), ...ACTION_PERMS.map((p) => p.key)];
/** What a new admin gets until the super admin changes it: every page, no delete or edit actions. */
export const DEFAULT_ADMIN_PERMS: Perm[] = PAGE_PERMS.map((p) => p.key);

const VALID = new Set<string>(ALL_PERMS);

/** Old logins used the role name "owner"; that is now the super admin. */
export function normalizeRole(role: unknown): Role | null {
  if (role === "owner") return "superadmin";
  return role === "superadmin" || role === "admin" || role === "cashier" ? role : null;
}

export function effectivePerms(role: Role, stored: readonly string[] | undefined): Perm[] {
  if (role === "superadmin") return ALL_PERMS;
  if (role === "admin") return (stored ?? []).filter((p): p is Perm => VALID.has(p));
  return [];
}

export const cleanPerms = (input: readonly string[]): Perm[] => [...new Set(input)].filter((p): p is Perm => VALID.has(p));
