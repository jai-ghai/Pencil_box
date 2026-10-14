# Pencil Box: Final Plan (v1)

Local shop: stationery, toys, gifts, printing and photocopy. No barcodes, no GST (for now), custom-built by the owner.

---

## 1. Goals

1. **Run the shop:** fast billing, accurate stock, supplier ordering, credit (udhar) tracking.
2. **Customer discovery:** a customer scans a QR in or outside the shop, lands on the website, and browses what Pencil Box sells by category and brand.
3. **Online orders:** cart, place order, pick up or get local delivery.
4. **One database** feeds the counter and the website, so stock never disagrees.

---

## 2. Stack

| Layer | Choice | Note |
|---|---|---|
| App | Next.js (TypeScript), App Router | Storefront, admin and POS in one repo |
| DB | MongoDB Atlas (M0 free, then M10) | Atlas is a replica set, so multi-document transactions work (needed for stock) |
| ODM | Mongoose | Simple schemas, transactions via sessions |
| Auth | Auth.js. Staff: email and password with roles. Customers: phone based | See section 6 |
| Images | Cloudinary (free tier) or S3 | Auto-resize, WebP, background removal |
| POS | Same app as a PWA | Installable on a tablet or laptop, offline queue for bills |
| Hosting | Vercel + Atlas | Low cost, low maintenance |
| Messaging | WhatsApp click-to-chat first. WhatsApp Business API later | No cost at launch |

---

## 3. Data model (MongoDB)

**Collections:** `products`, `variants`, `categories`, `brands`, `stock_movements`, `sales`, `purchases`, `suppliers`, `customers`, `services`, `orders`, `users`, `settings`.

- **brands:** Doms, Nataraj, Classmate, Camlin, Funskool, and so on. Each has a logo and an optional website.
- **categories:** a tree. Stationery > Pencils, Pens, Notebooks, Art. Toys > by age group. Gifts. Office. Printing and Copy.
- **products:** `name`, `brandId`, `categoryId`, `description`, `images[]`, `attributes{}`. Attributes are flexible, so MongoDB suits this:
  - Pencil: `{ type: "HB" }`
  - Notebook: `{ pages: 200, ruling: "single line" }`
  - Toy: `{ ageGroup: "3+", battery: true }`
- **variants** (the sellable and stockable unit): `productId`, `label` (e.g. "HB, single"), `shortCode`, `aliases[]`, `sellPrice`, `costPrice`, `baseUnit` ("piece"), `packSize` (10), `reorderLevel`, `stockOnHand` (cached), `taxRate` (default 0), `active`.
- **stock_movements** (append-only ledger): `variantId`, `type` (PURCHASE, SALE, ADJUSTMENT, DAMAGE, RETURN, SERVICE_USE, ONLINE_RESERVE), `qty` (+/-), `unitCost`, `refId`, `by`, `at`.
  - Every change writes a movement and atomically increments `variants.stockOnHand` in one transaction.
  - A nightly job verifies that the sum of movements equals `stockOnHand`.
- **sales:** items, total, payment `{cash | upi | credit | mixed}`, optional `customerId`, `cashierId`, `at`.
- **customers:** `phone`, `name`, `consent{at, version}`, `creditBalance`.
- **offers:** see section 4a.
- **services** (photocopy, print, lamination, passport photo): `rateSlabs`, `consumables[{variantId, qtyPerUnit}]`. A sale of a service auto-deducts paper and so on.
- **orders** (online): `items`, `status` (PLACED > CONFIRMED > READY > COLLECTED/DELIVERED, or CANCELLED), `fulfilment` (pickup | delivery), `reservedUntil`.

Indexes: text index on `name`, `aliases`, `shortCode` for fast POS search; `variants.active + categoryId` for the storefront.

---

## 4. QR to website to register flow

**Flow**
1. A QR code is placed at the shop front, on the counter, on bags, on bills and on posters. It points to a short URL, e.g. `pencilbox.in/q`, which redirects to the storefront. Use a URL you control, so the QR never changes. Use UTM tags per placement (`?src=counter`, `?src=bag`) to measure which placement works.
2. The customer lands on a **mobile-first catalogue** with no login needed. They can browse by category and brand (a brand strip: Doms, Nataraj and so on) and search.
3. They add items to a cart and place a pickup order (pickup only, no delivery).
4. **Offers are shown right on the product and in the cart**, e.g. "Buy 6, get 1 free". The cart applies them automatically (see section 4a).

**Customer data:** at order time collect only name and phone, with a consent checkbox. No paid registration and no account is needed to browse or order. See section 6.

**Catalogue note:** "Register" here means the Indian ledger/register notebook, an ordinary product in the Notebooks category (e.g. Register, 172 pages, Rs 20). It is not a sign-up.

## 4a. Offers engine

Offers are data, not code, so the owner can create them from the admin screen.

**Offer types (v1):**
- **Buy X get Y free** (same item): "Buy 6 notebooks, get 1 free".
- **Bundle price:** "Set of 3 for Rs 50".
- **Percent or flat discount** on an item or category, with a start and end date (festival, back-to-school).
- **Quantity slab:** "10+ pieces at Rs 18 each".

**Offer document:** `{ type, appliesTo: {variantIds | categoryId | brandId}, buyQty, freeQty, price, percent, startsAt, endsAt, active, label_en, label_hi }`.

**Rules:**
- The same engine runs for **online carts and POS billing**, so the counter and the website give identical discounts. It is one shared pure function with unit tests.
- Free items are added as zero-price lines, so **stock is still deducted** and the margin report stays honest.
- Repeating offers: buy 12 gives 2 free (offer applies per full group of 6).
- Overlap rule: one offer per line, whichever is best for the customer, to avoid stacking surprises. Stackable offers can be a later option.
- Storefront shows a badge on the product ("Buy 6 Get 1 Free") and a "you're 2 away from a free one" nudge in the cart.
- Validate offers server-side at order time. Never trust the client's discount.

---

## 5. Product images and "add item without clicking images"

**Reality check:** I'm not aware of any public API from Doms, Nataraj or similar brands that offers product images. Verify this by asking brand reps, but plan as if there isn't one. Scraping brand sites or marketplaces for images raises copyright and terms-of-service issues, so I won't build that.

**Practical sources, best first:**
1. **Ask the brand distributor or sales rep.** Brands routinely give retailers official catalogues and product image packs (PDFs, Drive folders). Get them for Doms, Nataraj, Classmate, Camlin and so on. This covers the bulk of your stock legally.
2. **Your own photos.** Phone photo > upload > automatic background removal and resize (Cloudinary or `rembg`) > clean white-background image in about 10 seconds.
3. **Reuse across variants.** One product image serves all of its variants.
4. **Category placeholder.** If there is no image yet, show a clean placeholder with the brand logo so the item can still go live.

**Fast add-item flow (admin):**
- Pick brand > pick category > type name. Attributes appear based on the category template.
- Drag a photo or take one with the phone camera. It is resized and cleaned automatically.
- Saved in under 30 seconds. Seed popular items in bulk through a **CSV import** (name, brand, category, price, pack size, image filename).
- "Duplicate variant" button, so adding HB, 2B and 4B takes seconds.

---

## 6. Security and privacy (DPDP Act aware)

- Collect minimal customer data (name, phone) with explicit consent. Store the consent timestamp and wording version.
- Provide delete-my-data on request.
- Never log phone numbers or document contents. Don't put personal data in URLs.
- Print uploads: stored privately, served only through signed URLs, and **auto-deleted after 24-48 hours**.
- Roles: `owner` (costs, margins, reports) and `cashier` (billing only). Cost prices are never sent to the cashier or public APIs.
- Rate-limit the public endpoints (orders, registration). Add a captcha if abuse appears.
- Validate prices server-side. Never trust the cart total from the client.
- Secrets in environment variables, never in the repo. Daily Atlas backups, with a restore test.

---

## 7. Modules and build order

| Phase | What | Outcome |
|---|---|---|
| **0. Setup** | Repo, Atlas, Cloudinary, env, base layout, auth, roles | Skeleton runs |
| **1. Inventory core** | Brands, categories, products, variants, pack/loose conversion, stock ledger, CSV import, add-item flow with images | You can enter your stock |
| **2. POS** | Quick-tap grid, search, cart, cash/UPI/credit, receipt (print or WhatsApp share), end-of-day cash summary, PWA offline queue | You can bill in the shop |
| **3. Purchasing** | Suppliers, purchase entry (adds stock), low-stock list, "order today" report | Supply is managed |
| **4. Storefront** | Catalogue by category and brand, search, product pages, cart, order placement, QR landing page | Customers browse via QR |
| **5. Orders and offers** | Offers engine (admin + shared pricing function), order inbox, stock reservation, status updates, WhatsApp "ready for pickup" link | Online flow works with offers |
| **6. Services** | Photocopy and print rates, consumable deduction, print-file upload | Service margin visible |
| **7. Reports** | Daily sales, top sellers, dead stock, margin by category, credit owed, QR source performance | Decisions from data |
| **8. Later** | Loyalty points, coupons, festival bundles, supplier POs, payment gateway | Growth |

Phases 0-2 make the **shop operational**. Phase 4 makes it **customer-facing**. I suggest building in that order, so the shop can open even if the website is a week behind.

---

## 8. Toys and other items

- Same product and variant model, with a category attribute template: toys get age group, battery/no battery and a brand (Funskool and so on).
- Buy from reputable suppliers and keep purchase bills. India has BIS safety requirements for toys, so check supplier compliance and avoid unmarked cheap imports for young children.
- Gifts: allow **bundles** (a hamper made of 3 items with a combined price that deducts all three from stock). Plan this into the schema from phase 1 (`bundleItems[]`).
- Seasonal tags (Diwali, Raksha Bandhan, school-reopening) so the storefront homepage can feature them.

---

## 9. Marketing plan (local first)

**Day 1 (free):**
- **Google Business Profile**: photos, hours, category "Stationery store", address, WhatsApp link. This is the biggest local lever.
- **WhatsApp Business**: catalogue, quick replies, greeting message. Put the number on the QR page.
- **Instagram**: short reels (new arrivals, a 10-second print/copy demo, toy unboxing).

**QR placements:** shop front sign, counter stand, carry bags, bills, printed on school-list handouts, posters near schools and tuition centres.

**Offers that fit a local shop:**
- School and tuition tie-ups: a booklist or bulk stationery price for a class or school.
- Back-to-school bundles (June-July), exam-season packs, Diwali and Raksha Bandhan gift hampers.
- Print/copy loyalty: the 10th set free, or a member discount.
- Referral: "bring a friend, both get Rs 20 off".

**Measure:** QR scans per placement (UTM), orders per week, repeat-customer rate, top searches that returned nothing (these show stock you should carry).

---

## 10. Costs (monthly, approximate, India)

- Atlas: Rs 0 (M0) to about Rs 4-5k (M10 when you grow)
- Vercel: Rs 0 on hobby, about Rs 1.7k on Pro (commercial use may require Pro, so check terms)
- Cloudinary: Rs 0 on the free tier
- Domain: about Rs 800-1,000 per year
- QR stands and posters: one-time, a few thousand rupees

Launch cost is close to just the domain.

---

## 11. Risks and how we handle them

| Risk | Mitigation |
|---|---|
| Staff skip billing ("off-system" sales) | Daily cash reconciliation and a weekly cycle count of 20-30 items |
| Stock drift between ledger and cached count | Transactions plus a nightly verification job |
| Internet drops at the counter | PWA offline queue; sync when back online |
| Images take too long to add | Brand image packs, CSV import, auto background removal |
| Overselling online | Reserve stock at order time, with a 30-60 minute expiry |
| Customer data leak | Minimal data, consent, roles, no PII in logs |

---

## 12. Decisions made

| Question | Decision | Effect on the plan |
|---|---|---|
| Fulfilment | **Pickup only** | No delivery address, fee or courier logic. Order statuses: PLACED > CONFIRMED > READY > COLLECTED (or CANCELLED). Customer sees "ready for pickup" |
| Counter device | **Laptop / desktop** | Keyboard-first POS (search focus, Enter to add, shortcuts). Touch grid stays as a secondary option. PWA offline queue still kept |
| Receipts | **Internal only, not given to customers** | A bill record is saved for the shop's own books. No customer receipt printing or sharing at launch. An optional print view can be added later |
| Languages | **English + Hindi** | Storefront has a language toggle (next-intl). Products get `name_en` and `name_hi`. Hindi falls back to English if empty. Admin/POS UI in English |
| "Register" at Rs 20 | **A ledger notebook product, not a sign-up** | Normal catalogue item. No membership or registration fee in the plan |
| Offers | **Buy 6 notebooks, get 1 free style offers** | Offers engine (section 4a), shared by POS and website. Because POS needs it, the pricing function is built in phase 2 and the admin offer screen follows |

## 13. Next step

Build phases 0-2: project setup, inventory (brands, categories, products, variants, ledger, CSV import, add-item with image upload) and the keyboard-first POS.
