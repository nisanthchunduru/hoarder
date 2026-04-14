import Dexie, { type Table } from "dexie";
import { Link, Collection } from "./interfaces";

class HoarderDB extends Dexie {
  links!: Table<Link, number>;
  collections!: Table<Collection, number>;

  constructor() {
    super("hoarder");
    this.version(1).stores({
      links: "++id, url, archived, collection_id",
      collections: "++id, &name, parent_id",
    });
    this.version(2).stores({
      links: "++id, url, archived, collection_id",
      collections: "++id, &name, parent_id, archived",
    }).upgrade(tx => {
      return tx.table("collections").toCollection().modify(c => {
        if (c.archived === undefined) c.archived = 0;
      });
    });
    this.version(3).stores({
      links: "++id, url, archived, collection_id",
      collections: "++id, &name, parent_id, archived, pinned",
    }).upgrade(tx => {
      return tx.table("collections").toCollection().modify(c => {
        if (c.pinned === undefined) c.pinned = 0;
      });
    });
  }
}

const db = new HoarderDB();
export default db;
