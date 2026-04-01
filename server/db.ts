import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "..", "db", "hoarder.db"));

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS link_tags (
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (link_id, tag_id)
  );
`);

// Migration: add collection_id to links if missing
const linkCols = db.prepare("PRAGMA table_info(links)").all() as { name: string }[];
if (!linkCols.some(c => c.name === "collection_id")) {
  db.exec("ALTER TABLE links ADD COLUMN collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL");
}

// Migration: add parent_id to collections if missing
const collCols = db.prepare("PRAGMA table_info(collections)").all() as { name: string }[];
if (!collCols.some(c => c.name === "parent_id")) {
  db.exec("ALTER TABLE collections ADD COLUMN parent_id INTEGER REFERENCES collections(id) ON DELETE SET NULL");
}

export default db;
