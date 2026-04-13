import Dexie, { type Table } from "dexie";
import { LinkRecord, CollectionRecord } from "./interfaces";

class HoarderDB extends Dexie {
  links!: Table<LinkRecord, number>;
  collections!: Table<CollectionRecord, number>;

  constructor() {
    super("hoarder");
    this.version(1).stores({
      links: "++id, url, archived, collection_id",
      collections: "++id, &name, parent_id",
    });
  }
}

const db = new HoarderDB();
export default db;
