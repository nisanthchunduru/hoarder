import db from "./db";

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);
  await db.transaction("rw", db.links, db.collections, async () => {
    await db.links.clear();
    await db.collections.clear();
    if (data.collections) await db.collections.bulkAdd(data.collections);
    if (data.links) await db.links.bulkAdd(data.links);
  });
}
