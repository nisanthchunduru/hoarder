import db from "./db";
import {
  getLink, getLinks, createLink, getLinkByUrl, updateLink, deleteLink, getTags,
  getCollections, getCollection, createCollection, updateCollection,
} from "./db-actions";
import { Link, Collection } from "./interfaces";

// ── Helpers ──

function getCollectionLinks(allLinks: Link[], collectionIds: Set<number>): Link[] {
  return allLinks.filter(l => l.collection_id && collectionIds.has(l.collection_id));
}

function getDescendantCollections(allCollections: Collection[], parentId: number): Collection[] {
  const result: Collection[] = [];
  for (const c of allCollections) {
    if (c.parent_id === parentId && c.id) {
      result.push(c);
      result.push(...getDescendantCollections(allCollections, c.id));
    }
  }
  return result;
}

// ── Link Actions ──

export async function createLinkIfNotExists(url: string): Promise<Link & { _duplicate?: boolean }> {
  const existing = await getLinkByUrl(url);
  if (existing) return { ...existing, _duplicate: true };
  return createLink(url);
}

export async function setLinkTags(id: number, tags: string[]): Promise<Link> {
  return updateLink(id, { tags });
}

export async function setLinkCollection(id: number, collectionId: number | null): Promise<void> {
  await updateLink(id, { collection_id: collectionId });
}

export async function toggleArchive(id: number): Promise<void> {
  const link = await getLink(id);
  await updateLink(id, { archived: link.archived ? 0 : 1 });
}

// ── Collection Actions ──

export async function moveCollection(id: number, parentId: number | null): Promise<void> {
  await updateCollection(id, { parent_id: parentId });
}

export async function renameCollection(id: number, name: string): Promise<void> {
  await updateCollection(id, { name: name.trim() });
}

export async function toggleArchiveCollection(id: number): Promise<void> {
  const coll = await getCollection(id);
  await updateCollection(id, { archived: coll.archived ? 0 : 1 });
}

export async function deleteCollectionAndDescendants(id: number): Promise<void> {
  const allCollections = await db.collections.toArray();
  const allLinks = await db.links.toArray();

  const descendants = getDescendantCollections(allCollections, id);
  const collectionsToDelete = [...descendants, { id } as Collection];
  const collectionIds = new Set(collectionsToDelete.map(c => c.id!));
  collectionIds.add(id);
  const linksToDelete = getCollectionLinks(allLinks, collectionIds);

  await db.links.bulkDelete(linksToDelete.map(l => l.id!));
  await db.collections.bulkDelete([...collectionIds]);
}

// ── Bundled actions for components ──

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
  archiveCollection: toggleArchiveCollection,
};

export default actions;
