import {
  getAll, getBy, getLink, getLinks, createLink, updateLink, deleteLink, getTags,
  getCollections, createCollection, updateCollection,
} from "./db-actions";
import { tx } from "./db";
import { LinkRecord, CollectionRecord } from "./interfaces";

// ── Helpers ──

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

// ── Actions ──

async function setLinkTags(id: number, tags: string[]): Promise<LinkRecord> {
  return updateLink(id, { tags });
}

async function setLinkCollection(id: number, collectionId: number | null): Promise<void> {
  await updateLink(id, { collection_id: collectionId });
}

async function toggleArchive(id: number): Promise<void> {
  const link = await getLink(id);
  await updateLink(id, { archived: link.archived ? 0 : 1 });
}

async function moveCollection(id: number, parentId: number | null): Promise<void> {
  await updateCollection(id, { parent_id: parentId });
}

async function renameCollection(id: number, name: string): Promise<void> {
  await updateCollection(id, { name: name.trim() });
}

async function deleteCollectionAndDescendants(id: number): Promise<void> {
  const allCollections = await getAll<CollectionRecord>("collections");
  const allLinks = await getAll<LinkRecord>("links");

  const descendants = getDescendantCollections(allCollections, id);
  const collectionsToDelete = [...descendants, id];
  const collectionIds = new Set(collectionsToDelete.map(c => typeof c === "number" ? c : c.id!));
  const linksToDelete = getCollectionLinks(allLinks, collectionIds);
  await deleteLinks(linksToDelete);
  await deleteCollections(collectionsToDelete);
}

async function createLinkIfNotExists(url: string): Promise<LinkRecord & { _duplicate?: boolean }> {
  const existing = await getBy<LinkRecord>("links", "url", url);
  if (existing) return { ...existing, _duplicate: true };
  return createLink(url);
}

const actions = {
  getLinks: getLinks,
  addLink: createLinkIfNotExists,
  setTags: setLinkTags,
  setCollection: setLinkCollection,
  archiveLink: toggleArchive,
  deleteLink: deleteLink,
  tags: getTags,
  collections: getCollections,
  createCollection: createCollection,
  deleteCollection: deleteCollectionAndDescendants,
  moveCollection,
  renameCollection,
};

export default actions;
