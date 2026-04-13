import { open } from "./db";

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
