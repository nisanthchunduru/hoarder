import db from "./db";

export async function exportData(): Promise<string> {
  const [links, collections] = await Promise.all([db.links.toArray(), db.collections.toArray()]);
  return JSON.stringify({ links, collections }, null, 2);
}
