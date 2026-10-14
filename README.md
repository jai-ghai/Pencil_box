# Pencil Box

Shop system for Pencil Box (stationery, gifts, art, school supplies, printing and photocopy). See [PLAN.md](PLAN.md) for the original plan.

## What it does

- **Website for customers** (`/`): no login. Shows only items that are in stock, with an empty picture block until photos are added, item codes, prices, offers, English/Hindi. Customers add items to a cart and tap **Order on WhatsApp**: a message with item names, codes, quantities and an estimated total opens in WhatsApp to the shop number. Pickup only.
- **Billing screen** (`/pos`): keyboard-first. Type a name or item code to find items, Enter to add, **F8 = Cash, F9 = UPI** (those are the only two payment options). Every bill is saved as an order.
- **Orders** (`/admin/orders`, and "Today's bills" on the billing screen): the bills you make, per day, with items, payment mode and totals. The cashier sees today only.
- **Admin** (`/admin`, owner only): dashboard, orders, products (with photos), stock, purchases from suppliers, offers, CSV import, brands and categories.

## Design

Built with **Ant Design 6** (the official React package), themed with the shop's navy and yellow, light and dark mode following the visitor's device. The design rules are in `.claude/skills/design-taste-frontend/SKILL.md` (Claude Code loads it automatically in this project). Theme tokens are in `src/lib/theme.ts`. Tailwind is used for layout only.

## Run it

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in (one file only). Never commit it.
   - `MONGODB_URI` (Atlas string ending in `/pencilbox`), `AUTH_SECRET` (32+ random chars), `CLOUDINARY_URL` (for photos).
   - `WHATSAPP_NUMBER`: the shop's WhatsApp number (India: 10 digits, or with 91). Without it the website shows "ordering will open soon" instead of the WhatsApp button. Restart the app after changing it.
   - `SEED_OWNER_PASSWORD` / `SEED_CASHIER_PASSWORD` for the first logins.
   - No Atlas yet? `npm run dev:db` starts a local database and prints the URI to use.
3. `npm run seed` creates the `owner` and `cashier` logins (only).
4. `npm run import:stock -- --replace` loads the opening stock from `data/balaji-stock.ts` if it exists (it is git-ignored because it holds supplier and cost prices), otherwise from the sample `data/stock.example.ts`. It wipes the catalogue and sales first and keeps logins. Use Admin > Products afterwards for changes.
5. `npm run dev`, then open http://localhost:3000 (customers) or /login (staff).

## QR codes and posters

```
npm run qr -- https://YOUR-DOMAIN.in/q --phone "XXXXX XXXXX"
```

Creates plain QR files (shop front, counter, bag, bill) and A4 posters in `print/`. `--phone` is optional. Every file is read back with a QR reader before it is saved. **A printed QR cannot be changed**, so run this only with your final domain. `/q` redirects to the shop page and keeps the `?src=` tag, so the destination can change later without reprinting.

## Commands

| Command | What it does |
|---|---|
| `npm test` | Offers, billing, stock, catalogue and WhatsApp tests (in-memory MongoDB) |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build |

## How it works

- **Money** is stored as integer paise. Screens show rupees.
- **Stock** is an append-only ledger. `stockOnHand` is a cached total updated in the same transaction; the dashboard flags any drift.
- **Offers** are data (Admin > Offers). One pure function (`src/lib/pricing.ts`) prices both the billing screen and the website cart, always on the server.
- **Item codes** (like `BP-02`) are generated automatically per category and appear in WhatsApp orders and on the billing screen search.
- **Prices:** each item has one price. (The data model can hold an optional higher price, `maxPrice`, but it is not used now.)
- **Public data** (`/api/store/*`) is an allow-list: no cost prices, supplier, private notes or exact stock counts, and it is rate limited.
- **Photos** go to Cloudinary when `CLOUDINARY_URL` is set, otherwise to `public/uploads` (local only).

## Before going live

- Strong unique passwords for the staff logins; a strong `AUTH_SECRET`; Atlas backups on.
- The login and public-API rate limits are in memory (fine for one server). Use a shared store if you run several instances.
- Set `WHATSAPP_NUMBER` and send yourself a test order from a phone.
