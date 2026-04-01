import { useState, useEffect, useCallback, useRef } from "react";
import "./style.css";

interface Link {
  id: number;
  url: string;
  title: string;
  description: string;
  archived: number;
  created_at: string;
  tags: string[];
}

interface TagCount { name: string; count: number; }
type Tab = "unread" | "archived";

const TAG_COLORS = [
  { bg: "#fff0f0", border: "#fecaca", text: "#b91c1c" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  { bg: "#fefce8", border: "#fde68a", text: "#a16207" },
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  { bg: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  { bg: "#f5f3ff", border: "#c4b5fd", text: "#6d28d9" },
  { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
];

function tagColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}

const api = {
  get: (q: string, archived: number, tag?: string) =>
    fetch(`/api/links?archived=${archived}&q=${encodeURIComponent(q)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`).then(r => r.json()),
  add: (url: string) =>
    fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).then(r => r.json()),
  setTags: (id: number, tags: string[]) =>
    fetch(`/api/links/${id}/tags`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) }).then(r => r.json()),
  archive: (id: number) => fetch(`/api/links/${id}/archive`, { method: "PATCH" }),
  delete: (id: number) => fetch(`/api/links/${id}`, { method: "DELETE" }),
  tags: () => fetch("/api/tags").then(r => r.json()),
};

function hostname(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d + "Z").getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Chip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const c = tagColor(name);
  return (
    <span className="chip" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
      {name}
      {onRemove && (
        <button className="chip-x" onClick={e => { e.stopPropagation(); onRemove(); }} style={{ color: c.text }} aria-label={`Remove ${name}`}>×</button>
      )}
    </span>
  );
}

function LinkTags({ link, allTags, onUpdate }: { link: Link; allTags: string[]; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState(link.tags);
  const [input, setInput] = useState("");
  const [hlIndex, setHlIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.trim()
    ? allTags.filter(s => s.includes(input.trim().toLowerCase()) && !tags.includes(s)).slice(0, 6)
    : [];

  useEffect(() => { setHlIndex(-1); }, [input]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      api.setTags(link.id, next).then(onUpdate);
    }
    setInput("");
    inputRef.current?.focus();
  };

  const removeTag = (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    api.setTags(link.id, next).then(onUpdate);
  };

  const cancel = () => { setTags(link.tags); setEditing(false); setInput(""); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && filtered.length) { e.preventDefault(); setHlIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp" && filtered.length) { e.preventDefault(); setHlIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length && hlIndex >= 0) addTag(filtered[hlIndex]);
      else if (input.trim()) addTag(input);
    }
    else if ((e.key === "," || e.key === "Tab") && input.trim()) { e.preventDefault(); addTag(input); }
    else if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
    else if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <div className="tag-row">
        {link.tags.map(t => <Chip key={t} name={t} />)}
        <button className="add-tag-btn" onClick={() => setEditing(true)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add tag
        </button>
      </div>
    );
  }

  return (
    <div className="tag-popover-anchor">
      <div className="tag-row">
        {link.tags.map(t => <Chip key={t} name={t} />)}
        <button className="add-tag-btn active" onClick={cancel}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add tag
        </button>
      </div>
      <div className="tag-popover">
        <div className="tag-popover-header">
          <span className="tag-popover-title">Tags</span>
          <button className="tag-popover-close" onClick={cancel}>✕</button>
        </div>
        <div className="tag-popover-input-wrap">
          <svg className="tag-popover-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or create tag…"
            aria-autocomplete="list"
          />
        </div>
        <div className="tag-popover-body">
          {tags.length > 0 && (
            <div className="tag-popover-section">
              <div className="tag-popover-chips">
                {tags.map(t => <Chip key={t} name={t} onRemove={() => removeTag(t)} />)}
              </div>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="tag-popover-section">
              <span className="tag-popover-label">Suggestions</span>
              <ul className="tag-popover-list" role="listbox">
                {filtered.map((s, i) => (
                  <li
                    key={s}
                    role="option"
                    aria-selected={i === hlIndex}
                    className={`tag-popover-option${i === hlIndex ? " hl" : ""}`}
                    onMouseDown={e => { e.preventDefault(); addTag(s); }}
                    onMouseEnter={() => setHlIndex(i)}
                  >
                    <Chip name={s} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {input.trim() && !filtered.includes(input.trim().toLowerCase()) && !tags.includes(input.trim().toLowerCase()) && (
            <button className="tag-popover-create" onMouseDown={e => { e.preventDefault(); addTag(input); }}>
              Create "<strong>{input.trim().toLowerCase()}</strong>"
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardMenu({ link, onUpdate }: { link: Link; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="card-menu" ref={ref}>
      <button className="card-menu-trigger" onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
          <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="8" cy="13" r="1.2" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div className="card-menu-dropdown">
          <button onClick={() => { api.archive(link.id).then(onUpdate); setOpen(false); }}>
            {link.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="danger" onClick={() => { api.delete(link.id).then(onUpdate); setOpen(false); }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [allTags, setAllTags] = useState<TagCount[]>([]);
  const [tab, setTab] = useState<Tab>("unread");
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string>();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get(search, tab === "archived" ? 1 : 0, filterTag).then(setLinks);
    api.tags().then(setAllTags);
  }, [search, tab, filterTag]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    await api.add(url.trim());
    setUrl("");
    setSaving(false);
    load();
  };

  return (
    <div className="shell">
      <header>
        <h1>Hoarder</h1>
        <p className="tagline">your read-it-later corner</p>
      </header>

      <form onSubmit={handleAdd} className="add-bar">
        <input type="url" placeholder="Paste a link…" value={url} onChange={e => setUrl(e.target.value)} required />
        <button disabled={saving}>{saving ? "Adding…" : "Add"}</button>
      </form>

      <div className="toolbar">
        <div className="tabs">
          <button className={tab === "unread" ? "active" : ""} onClick={() => setTab("unread")}>Unread</button>
          <button className={tab === "archived" ? "active" : ""} onClick={() => setTab("archived")}>Archive</button>
        </div>
        <input type="search" placeholder="Search…" className="search" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter">
          <button className={!filterTag ? "active" : ""} onClick={() => setFilterTag(undefined)}>All</button>
          {allTags.map(t => {
            const c = tagColor(t.name);
            return (
              <button
                key={t.name}
                className={filterTag === t.name ? "active" : ""}
                onClick={() => setFilterTag(filterTag === t.name ? undefined : t.name)}
                style={filterTag === t.name ? { borderColor: c.border, color: c.text, background: c.bg } : undefined}
              >
                {t.name} <span className="tag-count">{t.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {links.length === 0 ? (
        <p className="empty">
          {search || filterTag ? "No matches." : tab === "unread" ? "Nothing saved yet — paste a link above!" : "Archive is empty."}
        </p>
      ) : (
        <ul className="link-list">
          {links.map(l => (
            <li key={l.id} className="link-card">
              <div className="link-body">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="link-main">
                  <span className="link-title">{l.title}</span>
                  <span className="link-meta">{hostname(l.url)} · {timeAgo(l.created_at)}</span>
                  {l.description && <span className="link-desc">{l.description}</span>}
                </a>
                <LinkTags link={l} allTags={allTags.map(t => t.name)} onUpdate={load} />
              </div>
              <CardMenu link={l} onUpdate={load} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
