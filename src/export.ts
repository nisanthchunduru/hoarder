import { getAll } from "./db-actions";
import { LinkRecord, CollectionRecord } from "./interfaces";

export async function exportData(): Promise<string> {
  const [links, collections] = await Promise.all([getAll<LinkRecord>("links"), getAll<CollectionRecord>("collections")]);
  return JSON.stringify({ links, collections }, null, 2);
}
