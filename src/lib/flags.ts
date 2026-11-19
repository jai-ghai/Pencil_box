/**
 * Stock limits. Stock is not kept up to date automatically yet, so for now the website and the billing screen
 * do NOT hide sold-out items, cap quantities, show "few left" or warn about low stock. Stock is still counted
 * in the background (purchases add, sales deduct) and the Stock page and dashboard still show it.
 *
 * To switch the limits back on later, set ENFORCE_STOCK_LIMITS=true in the environment (Vercel settings or .env).
 */
export const ENFORCE_STOCK_LIMITS = process.env.ENFORCE_STOCK_LIMITS === "true";

/**
 * Hard atomic block: with this on, a sale that would take the shelf below zero fails inside the
 * transaction (two people cannot sell the same last piece). Off by default because stock counts are
 * not maintained well enough yet — turn it on only after counts are cleaned up, together with ENFORCE_STOCK_LIMITS.
 */
export const HARD_STOCK_BLOCK = process.env.HARD_STOCK_BLOCK === "true";
