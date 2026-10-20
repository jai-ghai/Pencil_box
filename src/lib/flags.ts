/**
 * Stock limits. Stock is not kept up to date automatically yet, so for now the website and the billing screen
 * do NOT hide sold-out items, cap quantities, show "few left" or warn about low stock. Stock is still counted
 * in the background (purchases add, sales deduct) and the Stock page and dashboard still show it.
 *
 * To switch the limits back on later, set ENFORCE_STOCK_LIMITS=true in the environment (Vercel settings or .env).
 */
export const ENFORCE_STOCK_LIMITS = process.env.ENFORCE_STOCK_LIMITS === "true";
