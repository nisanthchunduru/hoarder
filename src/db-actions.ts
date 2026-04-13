import db from "./db";
import { LinkRecord, CollectionRecord } from "./interfaces";

function now() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

// ── Links ──

export async function getLinks(q: string, archived: number, _tag?: string, collectionId?: number): Promise<LinkRecord[]> {
  let results = await db.links.where("archived").equals(archived).toArray();
  if (collectionId) results = results.filter(l => l.collection_id === collectionId);
  if (q) {
    const lower = q.toLowerCase();
    results = results.filter(l =>
      l.url.toLowerCase().includes(lower) || l.title.toLowerCase().includes(lower) || l.description.toLowerCase().includes(lower)
    );
  }
  return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createLink(url: string): Promise<LinkRecord> {
  const link: LinkRecord = { url, title: url, description: "", archived: 0, collection_id: null, created_at: now(), tags: [] };
  link.id = await db.links.add(link);
  return link;
}

export async function getLink(id: number): Promise<LinkRecord> {
  const link = await db.links.get(id);
  if (!link) throw new Error("Link not found");
  return link;
}

export function getLinkByUrl(url: string): Promise<LinkRecord | undefined> {
  return db.links.where("url").equals(url).first();
}

export async function updateLink(id: number, updates: Partial<LinkRecord>): Promise<LinkRecord> {
  await db.links.update(id, updates);
  return getLink(id);
}

export function deleteLink(id: number): Promise<void> {
  return db.links.delete(id);
}

export async function getTags(): Promise<{ name: string; count: number }[]> {
  const all = await db.links.toArray();
  const counts: Record<string, number> = {};
  for (const l of all) for (const t of l.tags) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
}

// ── Collections ──

export async function getCollections(): Promise<(CollectionRecord & { id: number; count: number })[]> {
  const [colls, links] = await Promise.all([db.collections.toArray(), db.links.toArray()]);
  return colls
    .map(c => ({ ...c, id: c.id!, count: links.filter(l => l.collection_id === c.id).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCollection(name: string, parentId?: number): Promise<CollectionRecord> {
  const coll: CollectionRecord = { name: name.trim(), parent_id: parentId ?? null, created_at: now() };
  coll.id = await db.collections.add(coll);
  return coll;
}

export async function getCollection(id: number): Promise<CollectionRecord> {
  const coll = await db.collections.get(id);
  if (!coll) throw new Error("Collection not found");
  return coll;
}

export async function updateCollection(id: number, updates: Partial<CollectionRecord>): Promise<CollectionRecord> {
  await db.collections.update(id, updates);
  return getCollection(id);
}
