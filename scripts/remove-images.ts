/**
 * Removes the stand-in pictures from every product and deletes the files from Cloudinary / the server.
 * Pictures you uploaded yourself are kept unless you pass --all.
 *
 *   npm run remove:images             only stand-in ("for illustration") pictures
 *   npm run remove:images -- --all    every product picture
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const { Product } = await import("../src/lib/models/index");
const { removeUnusedImages } = await import("../src/lib/catalog");

await mongoose.connect(process.env.MONGODB_URI!);
const all = process.argv.includes("--all");
const products = await Product.find({ "images.0": { $exists: true }, ...(all ? {} : { imageGeneric: true }) }).lean();
const urls = products.flatMap((p) => p.images);
await Product.updateMany({ _id: { $in: products.map((p) => p._id) } }, { $set: { images: [], imageGeneric: false }, $unset: { imageSource: "" } });
const removed = await removeUnusedImages(urls);
console.log(`cleared pictures on ${products.length} products; ${removed} of ${new Set(urls).size} files deleted from storage`);
await mongoose.disconnect();
