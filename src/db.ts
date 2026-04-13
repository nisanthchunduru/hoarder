const DB_NAME = "hoarder";
const DB_VERSION = 1;

interface LinkRecord {
  id?: number;
  url: string;
  title: string;
  description: string;
  archived: number;
  collection_id: number | null;
  created_at: string;
  tags: string[];
}

interface CollectionRecord {
  id?: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("links")) {
        const links = db.createObjectStore("links", { keyPath: "id", autoIncrement: true });
        links.createIndex("url", "url", { unique: true });
        links.createIndex("archived", "archived");
        links.createIndex("collection_id", "collection_id");
      }
      if (!db.objectStoreNames.contains("collections")) {
        const colls = db.createObjectStore("collections", { keyPath: "id", autoIncrement: true });
        colls.createIndex("name", "name", { unique: true });
        colls.createIndex("parent_id", "parent_id");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(storeName: string | string[], mode: IDBTransactionMode, fn: (stores: Record<string, IDBObjectStore>) => IDBRequest | void): Promise<T> {
  return open().then(db => new Promise((resolve, reject) => {
    const names = Array.isArray(storeName) ? storeName : [storeName];
    const t = db.transaction(names, mode);
    const stores: Record<string, IDBObjectStore> = {};
    for (const n of names) stores[n] = t.objectStore(n);
    const result = fn(stores);
    if (result) result.onsuccess = () => resolve(result.result as T);
    t.oncomplete = () => { if (!result) resolve(undefined as T); db.close(); };
    t.onerror = () => { reject(t.error); db.close(); };
  }));
}

function getAll<T>(storeName: string): Promise<T[]> {
  return tx(storeName, "readonly", (s) => s[storeName].getAll());
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

export async function addLink(url: string): Promise<LinkRecord & { _duplicate?: boolean }> {
  const all = await getAll<LinkRecord>("links");
  const existing = all.find(l => l.url === url);
  if (existing) return { ...existing, _duplicate: true };

  const link: LinkRecord = { url, title: url, description: "", archived: 0, collection_id: null, created_at: now(), tags: [] };
  const id = await tx<number>("links", "readwrite", (s) => s.links.add(link));
  return { ...link, id };
}

export async function setLinkTags(id: number, tags: string[]): Promise<LinkRecord> {
  const link = await tx<LinkRecord>("links", "readonly", (s) => s.links.get(id));
  link.tags = tags;
  await tx("links", "readwrite", (s) => s.links.put(link));
  return link;
}

export async function setLinkCollection(id: number, collectionId: number | null): Promise<void> {
  const link = await tx<LinkRecord>("links", "readonly", (s) => s.links.get(id));
  link.collection_id = collectionId;
  await tx("links", "readwrite", (s) => s.links.put(link));
}

export async function toggleArchive(id: number): Promise<void> {
  const link = await tx<LinkRecord>("links", "readonly", (s) => s.links.get(id));
  link.archived = link.archived ? 0 : 1;
  await tx("links", "readwrite", (s) => s.links.put(link));
}

export async function deleteLink(id: number): Promise<void> {
  await tx("links", "readwrite", (s) => s.links.delete(id));
}

export async function getTags(): Promise<{ name: string; count: number }[]> {
  const all = await getAll<LinkRecord>("links");
  const counts: Record<string, number> = {};
  for (const l of all) for (const t of l.tags) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
}

// ── Collections ──

export async function getCollections(): Promise<(CollectionRecord & { count: number })[]> {
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

function deleteEntities(storeName: string, items: ({ id?: number } | number)[]): Promise<void> {
  const ids = new Set(items.map(i => typeof i === "number" ? i : i.id!));
  return tx(storeName, "readwrite", (s) => { for (const id of ids) s[storeName].delete(id); });
}

function deleteLinks(items: (LinkRecord | number)[]): Promise<void> {
  return deleteEntities("links", items);
}

function deleteCollections(items: (CollectionRecord | number)[]): Promise<void> {
  return deleteEntities("collections", items);
}

function getCollectionLinks(allLinks: LinkRecord[], collectionIds: Set<number>): LinkRecord[] {
  return allLinks.filter(l => l.collection_id && collectionIds.has(l.collection_id));
}

export async function deleteCollectionAndDescendants(id: number): Promise<void> {
  const allCollections = await getAll<CollectionRecord>("collections");
  const allLinks = await getAll<LinkRecord>("links");

  const descendants = getDescendantCollections(allCollections, id);
  const collectionsToDelete = [...descendants, id];
  const collectionIds = new Set(collectionsToDelete.map(c => typeof c === "number" ? c : c.id!));
  const linksToDelete = getCollectionLinks(allLinks, collectionIds);
  await deleteLinks(linksToDelete);
  await deleteCollections(collectionsToDelete);
}

function getDescendantCollections(allCollections: CollectionRecord[], parentId: number): CollectionRecord[] {
  const result: CollectionRecord[] = [];
  for (const c of allCollections) {
    if (c.parent_id === parentId && c.id) {
      result.push(c);
      result.push(...getDescendantCollections(allCollections, c.id));
    }
  }
  return result;
}

export async function moveCollection(id: number, parentId: number | null): Promise<void> {
  const coll = await tx<CollectionRecord>("collections", "readonly", (s) => s.collections.get(id));
  coll.parent_id = parentId;
  await tx("collections", "readwrite", (s) => s.collections.put(coll));
}

export async function renameCollection(id: number, name: string): Promise<void> {
  const coll = await tx<CollectionRecord>("collections", "readonly", (s) => s.collections.get(id));
  coll.name = name.trim();
  await tx("collections", "readwrite", (s) => s.collections.put(coll));
}

// ── Export / Import ──

export async function exportData(): Promise<string> {
  const [links, collections] = await Promise.all([getAll<LinkRecord>("links"), getAll<CollectionRecord>("collections")]);
  return JSON.stringify({ links, collections }, null, 2);
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);
  const db = await open();
  const t = db.transaction(["links", "collections"], "readwrite");
  t.objectStore("links").clear();
  t.objectStore("collections").clear();
  await new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); });

  const t2 = db.transaction(["collections", "links"], "readwrite");
  for (const c of data.collections || []) t2.objectStore("collections").add(c);
  for (const l of data.links || []) t2.objectStore("links").add(l);
  await new Promise<void>((resolve, reject) => { t2.oncomplete = () => { db.close(); resolve(); }; t2.onerror = () => { db.close(); reject(t2.error); }; });
}
