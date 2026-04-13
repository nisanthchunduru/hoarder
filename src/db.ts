const DB_NAME = "hoarder";
const DB_VERSION = 1;

export function open(): Promise<IDBDatabase> {
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

export function tx<T>(storeName: string | string[], mode: IDBTransactionMode, fn: (stores: Record<string, IDBObjectStore>) => IDBRequest | void): Promise<T> {
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
