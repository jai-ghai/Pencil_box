import mongoose from "mongoose";

declare global {
  var __mongooseConn: Promise<typeof mongoose> | undefined;
}

/** Cached connection so dev hot-reloads and serverless invocations reuse one pool. */
export function connectDb(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  if (!globalThis.__mongooseConn) {
    globalThis.__mongooseConn = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 }).catch((e) => {
      globalThis.__mongooseConn = undefined;
      throw e;
    });
  }
  return globalThis.__mongooseConn;
}
