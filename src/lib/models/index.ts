import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

const opts = { timestamps: true } as const;

/* ---------- Users (staff) ---------- */
const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["superadmin", "admin", "cashier"], required: true },
    /** page and action permissions for an admin (the super admin always has all of them) */
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  opts,
);
export const User = model("User", userSchema);

/* ---------- Catalogue ---------- */
const brandSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    logoUrl: String,
    website: String,
  },
  opts,
);
export const Brand = model("Brand", brandSchema);

const categorySchema = new Schema(
  {
    name_en: { type: String, required: true, trim: true },
    name_hi: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    slug: { type: String, required: true, unique: true },
    /** attribute keys suggested in the add-item form, e.g. ["pages","ruling"] */
    attributeTemplate: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  opts,
);
export const Category = model("Category", categorySchema);

const productSchema = new Schema(
  {
    name_en: { type: String, required: true, trim: true },
    name_hi: { type: String, trim: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    description_en: String,
    description_hi: String,
    /** admin-only note, never shown to customers (e.g. "confirm sell price") */
    internalNote: { type: String, trim: true },
    /** true when the picture is a general stand-in from the internet, not the actual item */
    imageGeneric: { type: Boolean, default: false },
    /** where a stand-in picture came from (title, creator, licence, link); admin only */
    imageSource: { type: String },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    images: { type: [String], default: [] },
    attributes: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  opts,
);
productSchema.index({ name_en: "text", name_hi: "text", tags: "text" });
export const Product = model("Product", productSchema);

const bundleItemSchema = new Schema(
  { variantId: { type: Schema.Types.ObjectId, ref: "Variant", required: true }, qty: { type: Number, required: true, min: 1 } },
  { _id: false },
);

const variantSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    label: { type: String, default: "", trim: true },
    /** short typed code for fast POS search, e.g. "dpn" */
    shortCode: { type: String, lowercase: true, trim: true, index: true },
    aliases: { type: [String], default: [] },
    /** stored as a lower-cased search string: product name + brand + label + aliases + shortCode */
    searchText: { type: String, default: "", index: true },
    /** integer paise */
    sellPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    /** integer paise; optional higher price the shop may also charge (e.g. "25 or 30"). sellPrice is the lower one */
    maxPrice: { type: Number, min: 0 },
    baseUnit: { type: String, default: "piece" },
    /** how many base units come in one purchase pack, e.g. 10 pencils per box */
    packSize: { type: Number, default: 1, min: 1 },
    reorderLevel: { type: Number, default: 0, min: 0 },
    /** cached; the source of truth is the stock_movements ledger */
    stockOnHand: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    /** if set, selling this variant deducts these component variants instead (gift hampers) */
    bundleItems: { type: [bundleItemSchema], default: undefined },
    quickTap: { type: Boolean, default: false },
    /** false for services such as photocopy: billed, but no shelf stock to deduct */
    trackStock: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  opts,
);
export const Variant = model("Variant", variantSchema);

/* ---------- Suppliers & purchases ---------- */
const supplierSchema = new Schema(
  { name: { type: String, required: true, unique: true, trim: true }, phone: { type: String, trim: true }, notes: String, active: { type: Boolean, default: true } },
  opts,
);
export const Supplier = model("Supplier", supplierSchema);

const purchaseItemSchema = new Schema(
  { variantId: { type: Schema.Types.ObjectId, ref: "Variant", required: true }, name: String, qty: { type: Number, required: true }, unitCost: { type: Number, default: 0 }, lineTotal: { type: Number, default: 0 } },
  { _id: false },
);
const purchaseSchema = new Schema(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNo: String,
    note: String,
    items: { type: [purchaseItemSchema], default: [] },
    /** integer paise: sum of qty x unitCost */
    total: { type: Number, default: 0 },
    date: { type: Date, default: Date.now, index: true },
  },
  opts,
);
export const Purchase = model("Purchase", purchaseSchema);

/* ---------- Stock ledger (append-only) ---------- */
export const MOVEMENT_TYPES = ["PURCHASE", "SALE", "ADJUSTMENT", "DAMAGE", "RETURN", "SERVICE_USE", "ONLINE_RESERVE", "OPENING"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

const stockMovementSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "Variant", required: true, index: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    /** signed, in base units */
    qty: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    refId: Schema.Types.ObjectId,
    note: String,
    by: String,
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);
export const StockMovement = model("StockMovement", stockMovementSchema);

/* ---------- Offers ---------- */
const offerSchema = new Schema(
  {
    type: { type: String, enum: ["BUY_X_GET_Y", "BUNDLE", "PERCENT", "FLAT", "SLAB"], required: true },
    scope: {
      variantIds: { type: [String], default: [] },
      categoryIds: { type: [String], default: [] },
      brandIds: { type: [String], default: [] },
    },
    buyQty: Number,
    freeQty: Number,
    bundleQty: Number,
    bundlePrice: Number,
    percent: Number,
    flatOff: Number,
    slabMinQty: Number,
    slabPrice: Number,
    startsAt: Date,
    endsAt: Date,
    active: { type: Boolean, default: true },
    label_en: { type: String, required: true },
    label_hi: String,
  },
  opts,
);
export const OfferModel = model("Offer", offerSchema);

/* ---------- Sales (bills) ---------- */
const saleItemSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "Variant", required: true },
    name: String,
    qty: Number,
    freeUnits: { type: Number, default: 0 },
    unitPrice: Number,
    unitCost: Number,
    baseTotal: Number,
    discount: Number,
    lineTotal: Number,
    offerId: String,
    offerLabel: String,
  },
  { _id: false },
);

const saleSchema = new Schema(
  {
    billNo: { type: Number, required: true, unique: true },
    items: { type: [saleItemSchema], required: true },
    subtotal: Number,
    discount: Number,
    total: Number,
    payments: {
      cash: { type: Number, default: 0 },
      upi: { type: Number, default: 0 },
    },
    cashierId: String,
    note: String,
    /** "whatsapp" when the cart was filled from a pasted customer message */
    source: { type: String, enum: ["pos", "whatsapp"], default: "pos" },
    waText: String,
    editedAt: Date,
    editedBy: String,
    voided: { type: Boolean, default: false },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);
export const Sale = model("Sale", saleSchema);

/** Monotonic counters, e.g. bill numbers */
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = model("Counter", counterSchema);

/* ---------- Small settings (key/value), QR scan counts, audit trail ---------- */
const settingSchema = new Schema({ _id: { type: String }, value: { type: Schema.Types.Mixed } }, opts);
export const Setting = model("Setting", settingSchema);

/** One row per QR placement per day, counted every time /q is opened. */
const qrScanSchema = new Schema({ _id: { type: String }, src: { type: String, index: true }, day: { type: String, index: true }, count: { type: Number, default: 0 } });
export const QrScan = model("QrScan", qrScanSchema);

/** Who did what: deleted or edited bills, product archiving, user and permission changes. Never edited. */
const auditSchema = new Schema(
  {
    at: { type: Date, default: Date.now, index: true },
    by: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    summary: { type: String, required: true },
    /** snapshot of what was changed or removed, so a deleted bill can still be looked up */
    meta: Schema.Types.Mixed,
  },
  { timestamps: false },
);
export const AuditLog = model("AuditLog", auditSchema);

export type UserDoc = InferSchemaType<typeof userSchema>;
