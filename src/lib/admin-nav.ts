/**
 * Admin navigation structure. Groups drive the sidebar / drawer — not a flat list.
 * Permission keys still come from PAGE_PERMS; this file only decides order and labels in the UI.
 */
import type { Perm } from "./permissions";

export type NavPerm = Perm | "users";

export interface AdminNavItem {
  href: string;
  label: string;
  /** short line under the label in the sidebar */
  hint?: string;
  perm: NavPerm;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

/** Shop-ops first: plan seasons, log money, manage stock, then setup. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [{ href: "/admin", label: "Today", hint: "What needs doing", perm: "dashboard" }],
  },
  {
    id: "plan",
    label: "Plan",
    items: [
      { href: "/admin/calendar", label: "Calendar", hint: "Festivals & bills", perm: "calendar" },
      { href: "/admin/check", label: "Shop check", hint: "Walk the shelves", perm: "check" },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      { href: "/admin/daybook", label: "Daily book", hint: "Today's sale", perm: "daybook" },
      { href: "/admin/capital", label: "Capital", hint: "Cash vs shelf", perm: "capital" },
      { href: "/admin/analytics", label: "Profit", hint: "How the month looks", perm: "analytics" },
      { href: "/admin/orders", label: "Orders", hint: "Bills & WhatsApp", perm: "orders" },
      { href: "/admin/reports", label: "Reports", hint: "Sales breakdown", perm: "reports" },
    ],
  },
  {
    id: "stock",
    label: "Stock",
    items: [
      { href: "/admin/products", label: "Products", hint: "Items in the shop", perm: "products" },
      { href: "/admin/requests", label: "Buy list", hint: "Asks + what to buy", perm: "products" },
      { href: "/admin/stock", label: "Stock levels", hint: "Counts & reorder", perm: "stock" },
      { href: "/admin/purchases", label: "Purchases", hint: "Stock you bought", perm: "purchases" },
      { href: "/admin/offers", label: "Offers", hint: "Bundles & deals", perm: "offers" },
      { href: "/admin/import", label: "Import", hint: "CSV load", perm: "import" },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [
      { href: "/admin/categories", label: "Categories", hint: "Shelves on the shop", perm: "setup" },
      { href: "/admin/setup", label: "Brands & categories", hint: "Catalogue structure", perm: "setup" },
      { href: "/qr-generator", label: "QR codes", hint: "Print labels", perm: "qr" },
      { href: "/admin/users", label: "Users", hint: "Who can open what", perm: "users" },
    ],
  },
];

export function flatAdminNav(): AdminNavItem[] {
  return ADMIN_NAV_GROUPS.flatMap((g) => g.items);
}

/** Longest matching href wins (so /admin/products beats /admin). */
export function matchAdminNav(pathname: string): AdminNavItem | undefined {
  return flatAdminNav()
    .filter((n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
