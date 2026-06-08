import { useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useClickOutside } from "../useClickOutside";
import { hostname } from "../utils";
import actions from "../actions";
import { Link, Tab } from "../interfaces";
import Sidebar from "./Sidebar";
import Breadcrumb from "./Breadcrumb";
import LinkCard from "./LinkCard";
import Chip from "./Chip";
import { useTheme } from "../useTheme";
import "../style.css";

const PinSvg = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M9.5 1.8 14.2 6.5M10.8 3.1 7.6 6.3 5 5.8 4.1 6.7 9.3 11.9 10.2 11 9.7 8.4 12.9 5.2M7.5 9.5 3 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function App() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = window.location.hash;
  const isArchivedSection = location.startsWith("#/archived");

  const filterCollection = id ? Number(id) : undefined;
  const tab: Tab = (searchParams.get("tab") as Tab) || "unread";
  const filterTags: string[] = searchParams.getAll("tags[]");

  const [search, setSearch] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "domain" | "date">("none");
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const { theme, cycle } = useTheme();
  const [collMenuOpen, setCollMenuOpen] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [tagMenuOpen, setTagMenuOpen] = useState(false);

  const closeGroup = useCallback(() => setGroupMenuOpen(false), []);
  const closeColl = useCallback(() => setCollMenuOpen(false), []);
  const closeTag = useCallback(() => setTagMenuOpen(false), []);
  const groupRef = useClickOutside<HTMLDivElement>(groupMenuOpen, closeGroup);
  const collMenuRef = useClickOutside<HTMLDivElement>(collMenuOpen, closeColl);
  const tagMenuRef = useClickOutside<HTMLDivElement>(tagMenuOpen, closeTag);

  const allLinks = useLiveQuery(
    async () => {
      const archived = tab === "all" ? undefined : tab === "archived" ? 1 : 0;

      if (!filterCollection) {
        const archivedCollIds = new Set((await actions.collections()).filter(c => c.archived).map(c => c.id));
        const all = await actions.getLinks(search, archived);

        if (isArchivedSection) {
          return all.filter(l => l.collection_id && archivedCollIds.has(l.collection_id));
        }

        return all.filter(l => !l.collection_id || !archivedCollIds.has(l.collection_id));
      }

      return actions.getLinks(search, archived, undefined, filterCollection);
    },
    [search, tab, filterCollection, isArchivedSection]
  ) ?? [];

  const links = filterTags.length
    ? allLinks.filter(l => filterTags.some(t => l.tags.includes(t)))
    : allLinks;

  const allTags = useLiveQuery(() => actions.tags(), []) ?? [];
  const collections = useLiveQuery(() => actions.collections(), []) ?? [];
  const currentCollection = filterCollection ? collections.find(c => c.id === filterCollection) : undefined;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    const link = await actions.addLink(url.trim());
    if (filterCollection) await actions.setCollection(link.id!, filterCollection);
    setUrl("");
    setSaving(false);
  };

  const toggleTag = (name: string) => {
    setSearchParams(prev => {
      const current = prev.getAll("tags[]");
      prev.delete("tags[]");
      (current.includes(name) ? current.filter(t => t !== name) : [...current, name]).forEach(t => prev.append("tags[]", t));
      return prev;
    });
  };

  const visibleTags = [...new Set(allLinks.flatMap(l => l.tags))].sort();
  const allVisible = [...new Set([...visibleTags, ...filterTags])].sort();

  const renderLinks = () => {
    if (links.length === 0) {
      return (
        <p className="empty">
          {search || filterTags.length || filterCollection ? "No matches." : tab === "unread" ? "No links added yet — add a link above!" : "Archive is empty."}
        </p>
      );
    }

    const renderCard = (l: Link) => (
      <LinkCard key={l.id} link={l} collections={collections} filterCollection={filterCollection} allTags={allTags} />
    );

    if (groupBy !== "none") {
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
  };

  return (
    <div className="layout">
      <Sidebar collections={collections} filterCollection={filterCollection} isArchivedSection={isArchivedSection} />
      <button className="theme-toggle" onClick={cycle} title={`Theme: ${theme}`}>
        {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻"}
      </button>

      <main className="main">
        {filterCollection && <Breadcrumb collections={collections} filterCollection={filterCollection} isArchived={!!collections.find(c => c.id === filterCollection)?.archived} />}

        <div className="page-header">
          <h2 className="page-title">
            {renamingTitle && filterCollection ? (
              <span className="page-title-wrap">
                <span className="page-title-measure">{renameValue || " "}</span>
                <input
                  className="page-title-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && renameValue.trim()) { actions.renameCollection(filterCollection, renameValue.trim()); setRenamingTitle(false); }
                    if (e.key === "Escape") setRenamingTitle(false);
                  }}
                  onBlur={() => { if (renameValue.trim()) actions.renameCollection(filterCollection, renameValue.trim()); setRenamingTitle(false); }}
                  autoFocus
                />
              </span>
            ) : filterCollection && collections.find(c => c.id === filterCollection)
              ? collections.find(c => c.id === filterCollection)!.name
              : isArchivedSection ? "Archived" : "All"}
          </h2>
          {currentCollection && !renamingTitle && (
            <button
              type="button"
              className={`page-title-pin${currentCollection.pinned ? " pinned" : ""}`}
              title={currentCollection.pinned ? "Unpin collection" : "Pin collection"}
              aria-label={currentCollection.pinned ? "Unpin collection" : "Pin collection"}
              onClick={() => actions.pinCollection(currentCollection.id)}
            >
              <PinSvg />
            </button>
          )}
          {filterCollection && (
            <div className="card-menu" ref={collMenuRef}>
              <button className="card-menu-trigger" onClick={() => setCollMenuOpen(!collMenuOpen)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="4" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/>
                </svg>
              </button>
              {collMenuOpen && (
                <div className="card-menu-dropdown">
                  <button onClick={() => {
                    setCollMenuOpen(false);
                    const coll = collections.find(c => c.id === filterCollection);
                    if (coll) { setRenameValue(coll.name); setRenamingTitle(true); }
                  }}>Rename</button>
                  <button onClick={() => {
                    actions.archiveCollection(filterCollection!);
                    setCollMenuOpen(false);
                    navigate("/");
                  }}>{collections.find(c => c.id === filterCollection)?.archived ? "Unarchive" : "Archive"}</button>
                  <button className="danger" onClick={async () => {
                    if (window.confirm(`Delete "${collections.find(c => c.id === filterCollection)!.name}"?`)) {
                      await actions.deleteCollection(filterCollection);
                      navigate("/");
                      setCollMenuOpen(false);
                    }
                  }}>Delete</button>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleAdd} className="add-bar">
          <input type="url" placeholder="Paste a link" value={url} onChange={e => setUrl(e.target.value)} required />
          <button disabled={saving}>{saving ? "Adding…" : "Add"}</button>
        </form>

        <div className="toolbar">
          <div className="tabs">
            <button className={tab === "unread" ? "active" : ""} onClick={() => setSearchParams(prev => { prev.delete("tab"); return prev; })}>Saved</button>
            <button className={tab === "archived" ? "active" : ""} onClick={() => setSearchParams(prev => { prev.set("tab", "archived"); return prev; })}>Archived</button>
            <button className={tab === "all" ? "active" : ""} onClick={() => setSearchParams(prev => { prev.set("tab", "all"); return prev; })}>All</button>
          </div>
          <div className="group-menu" ref={groupRef}>
            <button className="group-toggle" onClick={() => setGroupMenuOpen(!groupMenuOpen)}>
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
          {allVisible.length > 0 && (
            <div className="tag-filter-menu" ref={tagMenuRef}>
              <button className="tag-filter-toggle" onClick={() => setTagMenuOpen(!tagMenuOpen)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2.5 8.1V3.6c0-.6.5-1.1 1.1-1.1h4.5c.3 0 .6.1.8.3l4.4 4.4c.4.4.4 1.1 0 1.6l-4.5 4.5c-.4.4-1.1.4-1.6 0L2.8 8.9c-.2-.2-.3-.5-.3-.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  <circle cx="5.2" cy="5.2" r="0.8" fill="currentColor"/>
                </svg>
                <svg className="group-chevron" width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {tagMenuOpen && (
                <div className="tag-filter-dropdown">
                  {allVisible.map(name => {
                    const selected = filterTags.includes(name);
                    return (
                      <button key={name} className={selected ? "selected" : ""} onClick={() => toggleTag(name)}>
                        <span className={`tag-checkbox${selected ? " checked" : ""}`}>
                          {selected && <svg className="tag-checkmark" width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 12c2 2 4.5 5.5 6 7c3-5 7-11 12-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                        </span>
                        <Chip name={name} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <input type="search" placeholder="Search" className="search" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {renderLinks()}
      </main>
    </div>
  );
}
