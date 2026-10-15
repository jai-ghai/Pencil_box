import type { ClientSession } from "mongoose";
import { AuditLog } from "./models";

/** Append one line to the audit trail. Pass the transaction session when the change itself is in a transaction. */
export async function audit(by: string, action: string, entity: string, summary: string, opts: { entityId?: string; meta?: unknown; session?: ClientSession } = {}): Promise<void> {
  await AuditLog.create([{ at: new Date(), by, action, entity, entityId: opts.entityId, summary: summary.slice(0, 300), meta: opts.meta }], opts.session ? { session: opts.session } : undefined);
}
