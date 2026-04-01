import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
app.use(cors(), express.json());

async function fetchMeta(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Hoarder/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    const html = await res.text();
    const title =
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
    const description =
      html
        .match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
        ?.trim() || "";
    return { title, description };
  } catch {
    return { title: "", description: "" };
  }
}

// Helper: get tags for a link
function tagsForLink(linkId: number): string[] {
  return (
    db
      .prepare(
        "SELECT t.name FROM tags t JOIN link_tags lt ON lt.tag_id = t.id WHERE lt.link_id = ?"
      )
      .all(linkId) as { name: string }[]
  ).map((r) => r.name);
}

// Helper: attach tags array to link rows
function withTags(rows: any | any[]) {
  const arr = Array.isArray(rows) ? rows : [rows];
  return arr.map((r) => ({ ...r, tags: tagsForLink(r.id) }));
}

// Helper: ensure tag exists, return its id
function ensureTag(name: string): number {
  db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(name);
  return (db.prepare("SELECT id FROM tags WHERE name = ?").get(name) as any).id;
}

// Helper: set tags for a link (replaces existing)
function setLinkTags(linkId: number, tags: string[]) {
  db.prepare("DELETE FROM link_tags WHERE link_id = ?").run(linkId);
  const insert = db.prepare(
    "INSERT INTO link_tags (link_id, tag_id) VALUES (?, ?)"
  );
  for (const tag of tags) {
    insert.run(linkId, ensureTag(tag.trim().toLowerCase()));
  }
}

// List links
app.get("/api/links", (req, res) => {
  const { q, archived, tag } = req.query;
  let sql = "SELECT DISTINCT l.* FROM links l";
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (tag) {
    sql += " JOIN link_tags lt ON lt.link_id = l.id JOIN tags t ON t.id = lt.tag_id";
    conditions.push("t.name = ?");
    params.push(String(tag).toLowerCase());
  }
  if (archived !== undefined) {
    conditions.push("l.archived = ?");
    params.push(Number(archived));
  }
  if (q) {
    conditions.push("(l.title LIKE ? OR l.url LIKE ? OR l.description LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY l.created_at DESC";

  res.json(withTags(db.prepare(sql).all(...params)));
});

// All tags
app.get("/api/tags", (_req, res) => {
  res.json(
    db
      .prepare(
        "SELECT t.name, COUNT(lt.link_id) as count FROM tags t JOIN link_tags lt ON lt.tag_id = t.id GROUP BY t.id ORDER BY t.name"
      )
      .all()
  );
});

// Add link
app.post("/api/links", async (req, res) => {
  const { url, tags } = req.body;
  if (!url) return res.status(400).json({ error: "url required" });

  const meta = await fetchMeta(url);
  const info = db
    .prepare("INSERT INTO links (url, title, description) VALUES (?, ?, ?)")
    .run(url, meta.title || url, meta.description);

  if (Array.isArray(tags) && tags.length) {
    setLinkTags(info.lastInsertRowid as number, tags);
  }

  res.json(
    withTags(db.prepare("SELECT * FROM links WHERE id = ?").get(info.lastInsertRowid))[0]
  );
});

// Update tags for a link
app.put("/api/links/:id/tags", (req, res) => {
  const { tags } = req.body;
  if (!Array.isArray(tags)) return res.status(400).json({ error: "tags array required" });
  setLinkTags(Number(req.params.id), tags);
  res.json(
    withTags(db.prepare("SELECT * FROM links WHERE id = ?").get(req.params.id))[0]
  );
});

// Toggle archive
app.patch("/api/links/:id/archive", (req, res) => {
  db.prepare("UPDATE links SET archived = NOT archived WHERE id = ?").run(
    req.params.id
  );
  res.json(
    withTags(db.prepare("SELECT * FROM links WHERE id = ?").get(req.params.id))[0]
  );
});

// Delete
app.delete("/api/links/:id", (req, res) => {
  db.prepare("DELETE FROM links WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

const server = app.listen(3001, () =>
  console.log("Hoarder API → http://localhost:3001")
);

process.on("SIGTERM", () => {
  server.close();
  db.close();
  process.exit(0);
});
