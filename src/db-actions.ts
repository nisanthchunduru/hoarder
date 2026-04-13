import { tx } from "./db";
import { LinkRecord, CollectionRecord } from "./interfaces";

// ── Generic CRUD ──

export function getAll<T>(storeName: string): Promise<T[]> {
  return tx(storeName, "readonly", (s) => s[storeName].getAll());
}

export function getBy<T>(storeName: string, indexName: string, value: string | number): Promise<T | undefined> {
  return tx(storeName, "readonly", (s) => s[storeName].index(indexName).get(value));
}

export function getEntity<T>(storeName: string, id: number): Promise<T> {
  return tx<T>(storeName, "readonly", (s) => s[storeName].get(id));
}

export async function updateEntity<T extends { id?: number }>(storeName: string, id: number, updates: Partial<T>): Promise<T> {
  const entity = await getEntity<T>(storeName, id);
  Object.assign(entity, updates);
  await tx(storeName, "readwrite", (s) => s[storeName].put(entity));
  return entity;
}

export function deleteEntity(storeName: string, id: number): Promise<void> {
  return tx(storeName, "readwrite", (s) => s[storeName].delete(id));
}

function now() { return new Date().toISOString().replace("T", " ").slice(0, 19); }

// ── Links ──

export async function getLinks(q: string, archived: number, _tag?: string, collectionId?: number): Promise<LinkRecord[]> {
  const all = await getAll<LinkRecord>("links");
  return all
    .filter(l => l.archived === archived)
    .filter(l => !collectionId || l.collection_id === collectionId)
    .filter(l => {
      if (!q) return true;
      const lower = q.toLowerCase();
      return l.url.toLowerCase().includes(lower) || l.title.toLowerCase().includes(lower) || l.description.toLowerCase().includes(lower);
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createLink(url: string): Promise<LinkRecord> {
  const link: LinkRecord = { url, title: url, description: "", archived: 0, collection_id: null, created_at: now(), tags: [] };
  const id = await tx<number>("links", "readwrite", (s) => s.links.add(link));
  return { ...link, id };
}

export const getLink = (id: number) => getEntity<LinkRecord>("links", id);
export const updateLink = (id: number, updates: Partial<LinkRecord>) => updateEntity<LinkRecord>("links", id, updates);
export const deleteLink = (id: number) => deleteEntity("links", id);

export async function getTags(): Promise<{ name: string; count: number }[]> {
  const all = await getAll<LinkRecord>("links");
  const counts: Record<string, number> = {};
  for (const l of all) for (const t of l.tags) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
}

// ── Collections ──

export async function getCollections(): Promise<(CollectionRecord & { id: number; count: number })[]> {
  const [colls, links] = await Promise.all([getAll<CollectionRecord>("collections"), getAll<LinkRecord>("links")]);
  return colls
    .map(c => ({ ...c, count: links.filter(l => l.collection_id === c.id).length }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCollection(name: string, parentId?: number): Promise<CollectionRecord> {
  const coll: CollectionRecord = { name: name.trim(), parent_id: parentId ?? null, created_at: now() };
  const id = await tx<number>("collections", "readwrite", (s) => s.collections.add(coll));
  return { ...coll, id };
}

export const getCollection = (id: number) => getEntity<CollectionRecord>("collections", id);
export const updateCollection = (id: number, updates: Partial<CollectionRecord>) => updateEntity<CollectionRecord>("collections", id, updates);
