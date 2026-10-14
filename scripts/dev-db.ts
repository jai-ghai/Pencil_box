/**
 * Local MongoDB (single-node replica set, so transactions work) for development without Atlas.
 * Data persists in ./.data/mongo between runs.
 *   npm run dev:db   then put  MONGODB_URI=mongodb://127.0.0.1:27117/pencilbox?replicaSet=rs0  in .env.local
 */
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const dbPath = path.join(process.cwd(), ".data", "mongo");
fs.mkdirSync(dbPath, { recursive: true });

const repl = await MongoMemoryReplSet.create({
  replSet: { name: "rs0", count: 1, storageEngine: "wiredTiger", dbName: "pencilbox" },
  instanceOpts: [{ port: 27117, dbPath, storageEngine: "wiredTiger" }],
});
console.log("\nLocal MongoDB ready. Use this in .env.local:");
console.log("MONGODB_URI=mongodb://127.0.0.1:27117/pencilbox?replicaSet=rs0\n");
console.log("Press Ctrl+C to stop.");

const stop = async () => {
  await repl.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
