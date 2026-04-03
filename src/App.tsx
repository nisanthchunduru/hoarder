import { useState, useEffect, useCallback, useRef } from "react";
import "./style.css";

interface Link {
  id: number;
  url: string;
  title: string;
  description: string;
  archived: number;
  collection_id: number | null;
  created_at: string;
  tags: string[];
}

interface TagCount { name: string; count: number; }
interface Collection { id: number; name: string; count: number; parent_id: number | null; }
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
  get: (q: string, archived: number, tag?: string, collectionId?: number) =>
    fetch(`/api/links?archived=${archived}&q=${encodeURIComponent(q)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}${collectionId ? `&collection_id=${collectionId}` : ""}`).then(r => r.json()),
  add: (url: string) =>
    fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).then(async r => {
      const data = await r.json();
      if (r.status === 409) return { ...data.link, _duplicate: true };
      return data;
    }),
  setTags: (id: number, tags: string[]) =>
    fetch(`/api/links/${id}/tags`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tags }) }).then(r => r.json()),
  setCollection: (id: number, collection_id: number | null) =>
    fetch(`/api/links/${id}/collection`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection_id }) }),
  archive: (id: number) => fetch(`/api/links/${id}/archive`, { method: "PATCH" }),
  delete: (id: number) => fetch(`/api/links/${id}`, { method: "DELETE" }),
  tags: () => fetch("/api/tags").then(r => r.json()),
  collections: () => fetch("/api/collections").then(r => r.json()),
  createCollection: (name: string, parent_id?: number) =>
    fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, parent_id }) }).then(r => r.json()),
  deleteCollection: (id: number) => fetch(`/api/collections/${id}`, { method: "DELETE" }),
  moveCollection: (id: number, parent_id: number | null) =>
    fetch(`/api/collections/${id}/parent`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parent_id }) }),
  renameCollection: (id: number, name: string) =>
    fetch(`/api/collections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
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
  const close = () => { setEditing(false); setInput(""); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && filtered.length) { e.preventDefault(); setHlIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp" && filtered.length) { e.preventDefault(); setHlIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length && hlIndex >= 0) addTag(filtered[hlIndex]);
      else if (input.trim()) addTag(input);
      close();
    }
    else if (e.key === "Tab" && input.trim()) { e.preventDefault(); addTag(input); }
    else if (e.key === "Tab" && !input.trim()) { close(); }
    else if (e.key === "," && input.trim()) { e.preventDefault(); addTag(input); }
    else if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
    else if (e.key === "Escape") cancel();
  };

  if (!editing) {
    const quickRemove = (t: string) => {
      const next = link.tags.filter(x => x !== t);
      setTags(next);
      api.setTags(link.id, next).then(onUpdate);
    };
    return (
      <div className="tag-row">
        {link.tags.map(t => <Chip key={t} name={t} onRemove={() => quickRemove(t)} />)}
        <button className="add-tag-btn" onClick={() => setEditing(true)}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
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
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
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
            placeholder="Search or create tag  ⏎ done · ⇥ add more"
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
                  <li key={s} role="option" aria-selected={i === hlIndex}
                    className={`tag-popover-option${i === hlIndex ? " hl" : ""}`}
                    onMouseDown={e => { e.preventDefault(); addTag(s); }}
                    onMouseEnter={() => setHlIndex(i)}
                  ><Chip name={s} /></li>
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
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="card-menu" ref={ref}>
      <button className="card-menu-trigger" onClick={() => { setOpen(!open); }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="4" r="1.2" fill="currentColor"/>
          <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="8" cy="12" r="1.2" fill="currentColor"/>
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
  const params = new URLSearchParams(window.location.search);
  const [links, setLinks] = useState<Link[]>([]);
  const [allTags, setAllTags] = useState<TagCount[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "unread");
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | undefined>(params.get("tag") || undefined);
  const [filterCollection, setFilterCollection] = useState<number | undefined>(params.get("collection") ? Number(params.get("collection")) : undefined);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [newCollectionParent, setNewCollectionParent] = useState<number | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "domain" | "date">("none");
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupMenuOpen) return;
    const close = (e: MouseEvent) => { if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [groupMenuOpen]);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    if (tab !== "unread") p.set("tab", tab);
    if (filterCollection) p.set("collection", String(filterCollection));
    if (filterTag) p.set("tag", filterTag);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : "/");
  }, [tab, filterCollection, filterTag]);

  const load = useCallback(() => {
    api.get(search, tab === "archived" ? 1 : 0, filterTag, filterCollection).then(setLinks);
    api.tags().then(setAllTags);
    api.collections().then(setCollections);
  }, [search, tab, filterTag, filterCollection]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    const link = await api.add(url.trim());
    if (filterCollection) await api.setCollection(link.id, filterCollection);
    setUrl("");
    setSaving(false);
    load();
  };

  const handleNewCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.trim()) return;
    await api.createCollection(newCollection.trim(), newCollectionParent || undefined);
    setNewCollection("");
    setShowNewCollection(false);
    setNewCollectionParent(null);
    load();
  };

  const startNewCollection = (parentId: number | null = null) => {
    setNewCollectionParent(parentId);
    setShowNewCollection(true);
  };

  const cancelNewCollection = () => {
    setNewCollection("");
    setShowNewCollection(false);
    setNewCollectionParent(null);
  };

  const handleDrop = (e: React.DragEvent, targetCollectionId: number | null) => {
    e.currentTarget.classList.remove("drop-over");
    const linkId = e.dataTransfer.getData("text/link-id");
    const collId = e.dataTransfer.getData("text/collection-id");
    if (linkId) {
      api.setCollection(+linkId, targetCollectionId).then(load);
    } else if (collId && +collId !== targetCollectionId) {
      api.moveCollection(+collId, targetCollectionId).then(load);
    }
  };

  const renderCollections = (parentId: number | null, depth: number): React.ReactNode => {
    const children = collections.filter(c => (c.parent_id ?? null) === parentId);
    return children.map(c => (
      <div key={c.id}>
        <div className="sidebar-item-row" style={{ paddingLeft: 12 + depth * 16 }}>
          <button
            className={`sidebar-item${filterCollection === c.id ? " active" : ""}`}
            draggable={renamingId !== c.id}
            onClick={() => { if (renamingId !== c.id) setFilterCollection(filterCollection === c.id ? undefined : c.id); }}
            onDoubleClick={e => { e.stopPropagation(); setFilterCollection(c.id); setRenamingId(c.id); setRenameValue(c.name); }}
            onDragStart={e => { e.dataTransfer.setData("text/collection-id", String(c.id)); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={e => e.preventDefault()}
            onDragEnter={e => e.currentTarget.classList.add("drop-over")}
            onDragLeave={e => e.currentTarget.classList.remove("drop-over")}
            onDrop={e => handleDrop(e, c.id)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 6h11" stroke="currentColor" strokeWidth="1.2"/></svg>
            {renamingId === c.id ? (
              <input
                className="sidebar-rename-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && renameValue.trim()) { api.renameCollection(c.id, renameValue.trim()).then(load); setRenamingId(null); }
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onBlur={() => { if (renameValue.trim() && renameValue !== c.name) { api.renameCollection(c.id, renameValue.trim()).then(load); } setRenamingId(null); }}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            ) : c.name}
            <span className="sidebar-add-child" title="Add sub-collection" onClick={e => { e.stopPropagation(); startNewCollection(c.id); }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
          </button>
        </div>
        {showNewCollection && newCollectionParent === c.id && (
          <form onSubmit={handleNewCollection} className="sidebar-new-form" style={{ paddingLeft: 12 + (depth + 1) * 16 }}>
            <input
              value={newCollection}
              onChange={e => setNewCollection(e.target.value)}
              placeholder="Sub-collection name"
              autoFocus
              onBlur={() => { if (!newCollection.trim()) cancelNewCollection(); }}
              onKeyDown={e => { if (e.key === "Escape") cancelNewCollection(); }}
            />
          </form>
        )}
        {renderCollections(c.id, depth + 1)}
      </div>
    ));
  };

  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("sidebarWidth")) || 220);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => { localStorage.setItem("sidebarWidth", String(sidebarWidth)); }, [sidebarWidth]);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => setSidebarWidth(Math.max(220, startW + ev.clientX - startX));
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div className="layout">
      <div className="sidebar-wrapper" style={{ width: sidebarWidth, position: "relative", flexShrink: 0 }}>
        <aside className="sidebar">
        <h1 className="sidebar-logo">Hoarder</h1>
        <nav className="sidebar-nav">
          <span className="sidebar-label">Collections</span>
          <div className="sidebar-item-row">
            <button
              className={`sidebar-item${!filterCollection ? " active" : ""}`}
              onClick={() => setFilterCollection(undefined)}
              onDragOver={e => e.preventDefault()}
              onDragEnter={e => e.currentTarget.classList.add("drop-over")}
              onDragLeave={e => e.currentTarget.classList.remove("drop-over")}
              onDrop={e => handleDrop(e, null)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1.5 6h11" stroke="currentColor" strokeWidth="1.2"/></svg>
              All
              <span className="sidebar-add-child" title="New collection" onClick={e => { e.stopPropagation(); startNewCollection(null); }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
            </button>
          </div>
          {showNewCollection && newCollectionParent === null && (
            <form onSubmit={handleNewCollection} className="sidebar-new-form">
              <input
                value={newCollection}
                onChange={e => setNewCollection(e.target.value)}
                placeholder="Collection name"
                autoFocus
                onBlur={() => { if (!newCollection.trim()) cancelNewCollection(); }}
                onKeyDown={e => { if (e.key === "Escape") cancelNewCollection(); }}
              />
            </form>
          )}
          {renderCollections(null, 0)}
        </nav>
        <div className="sidebar-resize" onMouseDown={onResizeStart} onDoubleClick={() => setSidebarWidth(220)} />
        </aside>
      </div>

      <main className="main">
        <form onSubmit={handleAdd} className="add-bar">
          <input type="url" placeholder="Paste a link" value={url} onChange={e => setUrl(e.target.value)} required />
          <button disabled={saving}>{saving ? "Adding…" : "Add"}</button>
        </form>

        <div className="toolbar">
          <div className="tabs">
            <button className={tab === "unread" ? "active" : ""} onClick={() => setTab("unread")}>Unread</button>
            <button className={tab === "archived" ? "active" : ""} onClick={() => setTab("archived")}>Archive</button>
          </div>
          {filterCollection && (
            <div className="group-menu" ref={groupRef}>
              <button
                className={`group-toggle${groupBy !== "none" ? " active" : ""}`}
                onClick={() => setGroupMenuOpen(!groupMenuOpen)}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
                <svg className="group-chevron" width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {groupMenuOpen && (
                <div className="group-dropdown">
                  <button className={groupBy === "none" ? "active" : ""} onClick={() => { setGroupBy("none"); setGroupMenuOpen(false); }}>None</button>
                  <div className="group-dropdown-divider" />
                  <button className={groupBy === "domain" ? "active" : ""} onClick={() => { setGroupBy("domain"); setGroupMenuOpen(false); }}>Domain</button>
                  <button className={groupBy === "date" ? "active" : ""} onClick={() => { setGroupBy("date"); setGroupMenuOpen(false); }}>Date added</button>
                </div>
              )}
            </div>
          )}
          <input type="search" placeholder="Search" className="search" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {(() => {
          const visibleTags = [...new Set(links.flatMap(l => l.tags))].sort();
          return visibleTags.length > 0 && (
            <div className="tag-filter">
              <button className={!filterTag ? "active" : ""} onClick={() => setFilterTag(undefined)}>All</button>
              {visibleTags.map(name => {
                const c = tagColor(name);
                return (
                  <button
                    key={name}
                    className={filterTag === name ? "active" : ""}
                    onClick={() => setFilterTag(filterTag === name ? undefined : name)}
                    style={filterTag === name ? { borderColor: c.border, color: c.text, background: c.bg } : undefined}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {links.length === 0 ? (
          <p className="empty">
            {search || filterTag || filterCollection ? "No matches." : tab === "unread" ? "Nothing saved yet — paste a link above!" : "Archive is empty."}
          </p>
        ) : (() => {
          const renderCard = (l: Link) => (
            <li key={l.id} className="link-card" draggable
              onDragStart={e => { e.dataTransfer.setData("text/link-id", String(l.id)); e.dataTransfer.effectAllowed = "move"; }}
            >
              <div className="card-grip">
                <button className="copy-btn" title="Copy link" onClick={() => { navigator.clipboard.writeText(l.url); }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                </button>
              </div>
              <div className="link-body">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="link-main">
                  <span className="link-title">{l.url}</span>
                  <span className="link-meta">
                    {hostname(l.url)} · {timeAgo(l.created_at)}
                  </span>
                  {l.description && <span className="link-desc">{l.description}</span>}
                </a>
                <LinkTags link={l} allTags={allTags.map(t => t.name)} onUpdate={load} />
              </div>
              <CardMenu link={l} onUpdate={load} />
            </li>
          );

          if (groupBy !== "none" && filterCollection) {
            const groups: Record<string, Link[]> = {};
            for (const l of links) {
              const key = groupBy === "domain"
                ? hostname(l.url)
                : new Date(l.created_at + "Z").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
              (groups[key] ??= []).push(l);
            }
            const sorted = groupBy === "domain"
              ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
              : Object.entries(groups);
            return (
              <div className="grouped-links">
                {sorted.map(([label, items]) => (
                  <div key={label} className="domain-group">
                    <div className="domain-header">{label}</div>
                    <ul className="link-list">{items.map(renderCard)}</ul>
                  </div>
                ))}
              </div>
            );
          }

          return <ul className="link-list">{links.map(renderCard)}</ul>;
        })()}
      </main>
    </div>
  );
}
