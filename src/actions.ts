import db from "./db";
import {
  getLink, getLinks, createLink, getLinkByUrl, updateLink, deleteLink, getTags,
  getCollections, createCollection, updateCollection,
} from "./db-actions";
import { LinkRecord, CollectionRecord } from "./interfaces";

// ── Helpers ──

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
  const allCollections = await db.collections.toArray();
  const allLinks = await db.links.toArray();

  const descendants = getDescendantCollections(allCollections, id);
  const collectionsToDelete = [...descendants, { id } as CollectionRecord];
  const collectionIds = new Set(collectionsToDelete.map(c => c.id!));
  collectionIds.add(id);
  const linksToDelete = getCollectionLinks(allLinks, collectionIds);

  await db.links.bulkDelete(linksToDelete.map(l => l.id!));
  await db.collections.bulkDelete([...collectionIds]);
}

async function createLinkIfNotExists(url: string): Promise<LinkRecord & { _duplicate?: boolean }> {
  const existing = await getLinkByUrl(url);
  if (existing) return { ...existing, _duplicate: true };
  return createLink(url);
}

const actions = {
  getLinks,
  addLink: createLinkIfNotExists,
  setTags: setLinkTags,
  setCollection: setLinkCollection,
  archiveLink: toggleArchive,
  deleteLink,
  tags: getTags,
  collections: getCollections,
  createCollection,
  deleteCollection: deleteCollectionAndDescendants,
  moveCollection,
  renameCollection,
};

export default actions;
