import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useClickOutside } from "../useClickOutside";
import actions from "../actions";
import { exportData } from "../export";
import { importData } from "../import";
import { Collection } from "../interfaces";

export default function Sidebar({ collections, filterCollection, isArchivedSection }: {
  collections: (Collection & { id: number })[];
  filterCollection?: number;
  isArchivedSection?: boolean;
}) {
  const [newCollection, setNewCollection] = useState("");
  const navigate = useNavigate();
  const [newCollectionParent, setNewCollectionParent] = useState<number | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("sidebarWidth")) || 220);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);

  const closeLogo = useCallback(() => setLogoMenuOpen(false), []);
  const logoMenuRef = useClickOutside<HTMLDivElement>(logoMenuOpen, closeLogo);

  useEffect(() => { localStorage.setItem("sidebarWidth", String(sidebarWidth)); }, [sidebarWidth]);

  const toggleCollapse = (key: string | number) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const startNewCollection = (parentId: number | null = null) => { setNewCollectionParent(parentId); setShowNewCollection(true); };
  const cancelNewCollection = () => { setNewCollection(""); setShowNewCollection(false); setNewCollectionParent(null); };

  const handleNewCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.trim()) return;
    await actions.createCollection(newCollection.trim(), newCollectionParent || undefined);
    setNewCollection("");
    setShowNewCollection(false);
    setNewCollectionParent(null);
  };

  const handleDrop = (e: React.DragEvent, targetCollectionId: number | null) => {
    e.currentTarget.classList.remove("drop-over");
    const linkId = e.dataTransfer.getData("text/link-id");
    const collId = e.dataTransfer.getData("text/collection-id");
    if (linkId) actions.setCollection(+linkId, targetCollectionId);
    else if (collId && +collId !== targetCollectionId) actions.moveCollection(+collId, targetCollectionId);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (ev: MouseEvent) => setSidebarWidth(Math.max(220, startW + ev.clientX - startX));
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const hasArchivedDescendant = (id: number): boolean => {
    return collections.some(c => c.parent_id === id && (c.archived || hasArchivedDescendant(c.id!)));
  };

  const renderCollections = (parentId: number | null, depth: number, section: "active" | "archived" = "active"): React.ReactNode => {
    const children = collections.filter(c => {
      if ((c.parent_id ?? null) !== parentId) return false;
      if (section === "active") return !c.archived;
      return c.archived || hasArchivedDescendant(c.id!);
    });
    return children.map(c => {
      const hasChildren = collections.some(ch => ch.parent_id === c.id);
      const collapseKey = `${section}:${c.id}`;
      const isCollapsed = collapsed[collapseKey];
      return (
        <div key={c.id}>
          <div className="sidebar-item-row" style={{ paddingLeft: 12 + depth * 16 }}>
            <button
              className={`sidebar-item${filterCollection === c.id && (section === "archived" === !!isArchivedSection) ? " active" : ""}${section === "archived" && !c.archived ? " context-only" : ""}`}
              draggable={renamingId !== c.id && !(section === "archived" && !c.archived)}
              onClick={() => {
                if (renamingId === c.id) return;
                const prefix = section === "archived" ? "/archived" : "";
                navigate(filterCollection === c.id ? (section === "archived" ? "/archived" : "/") : `${prefix}/collections/${c.id}`);
              }}
              onDoubleClick={e => {
                e.stopPropagation();
                const prefix = section === "archived" ? "/archived" : "";
                navigate(`${prefix}/collections/${c.id}`); setRenamingId(c.id!); setRenameValue(c.name);
              }}
              onDragStart={e => { e.dataTransfer.setData("text/collection-id", String(c.id)); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={e => e.preventDefault()}
              onDragEnter={e => e.currentTarget.classList.add("drop-over")}
              onDragLeave={e => e.currentTarget.classList.remove("drop-over")}
              onDrop={e => handleDrop(e, c.id)}
            >
              <span className={`sidebar-chevron${isCollapsed ? "" : " open"}`} onClick={e => { e.stopPropagation(); toggleCollapse(collapseKey); }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              {renamingId === c.id ? (
                <input
                  className="sidebar-rename-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && renameValue.trim()) { actions.renameCollection(c.id, renameValue.trim()); setRenamingId(null); } if (e.key === "Escape") setRenamingId(null); }}
                  onBlur={() => { if (renameValue.trim() && renameValue !== c.name) actions.renameCollection(c.id, renameValue.trim()); setRenamingId(null); }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : c.name}
              <span className="sidebar-add-child" title="Add sub-collection" style={section === "archived" ? { visibility: "hidden" } : undefined} onClick={e => { e.stopPropagation(); startNewCollection(c.id); }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
            </button>
          </div>
          {showNewCollection && newCollectionParent === c.id && (
            <form onSubmit={handleNewCollection} className="sidebar-new-form" style={{ paddingLeft: 12 + (depth + 1) * 16 }}>
              <input value={newCollection} onChange={e => setNewCollection(e.target.value)} placeholder="Sub-collection name" autoFocus onBlur={() => { if (!newCollection.trim()) cancelNewCollection(); }} onKeyDown={e => { if (e.key === "Escape") cancelNewCollection(); }} />
            </form>
          )}
          {!isCollapsed && renderCollections(c.id, depth + 1, section)}
        </div>
      );
    });
  };

  return (
    <div className="sidebar-wrapper" style={{ width: sidebarWidth }}>
      <div className="sidebar-logo-row">
        <h1 className="sidebar-logo">Hoarder <span className="beta-badge">beta</span></h1>
        <div className="card-menu" ref={logoMenuRef}>
          <button className="card-menu-trigger" onClick={() => setLogoMenuOpen(!logoMenuOpen)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="4" cy="8" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/>
            </svg>
          </button>
          {logoMenuOpen && (
            <div className="card-menu-dropdown logo-menu-dropdown">
              <button onClick={async () => {
                const json = await exportData();
                const blob = new Blob([json], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "hoarder.json"; a.click();
                setLogoMenuOpen(false);
              }}>Export data</button>
              <button onClick={() => {
                const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
                input.onchange = async () => { const file = input.files?.[0]; if (!file) return; const json = await file.text(); if (window.confirm("Importing data will replace all existing data. Continue?")) await importData(json); };
                input.click(); setLogoMenuOpen(false);
              }}>Import data</button>
            </div>
          )}
        </div>
      </div>
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <span className="sidebar-label">Collections</span>
          <div className="sidebar-item-row">
            <button
              className={`sidebar-item${!filterCollection ? " active" : ""}`}
              onClick={() => navigate("/")}
              onDragOver={e => e.preventDefault()}
              onDragEnter={e => e.currentTarget.classList.add("drop-over")}
              onDragLeave={e => e.currentTarget.classList.remove("drop-over")}
              onDrop={e => handleDrop(e, null)}
            >
              <span className={`sidebar-chevron${collapsed[-1] ? "" : " open"}`} onClick={e => { e.stopPropagation(); toggleCollapse(-1); }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              All
              <span className="sidebar-add-child" title="New collection" onClick={e => { e.stopPropagation(); startNewCollection(null); }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
            </button>
          </div>
          {showNewCollection && newCollectionParent === null && (
            <form onSubmit={handleNewCollection} className="sidebar-new-form">
              <input value={newCollection} onChange={e => setNewCollection(e.target.value)} placeholder="Collection name" autoFocus onBlur={() => { if (!newCollection.trim()) cancelNewCollection(); }} onKeyDown={e => { if (e.key === "Escape") cancelNewCollection(); }} />
            </form>
          )}
          {!collapsed[-1] && renderCollections(null, 0)}
          {collections.some(c => c.archived) && (
            <div className="sidebar-item-row">
              <button
                className="sidebar-item"
                onClick={() => navigate("/archived")}
              >
                <span className={`sidebar-chevron${collapsed[-2] ? "" : " open"}`} onClick={e => { e.stopPropagation(); toggleCollapse(-2); }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                Archived
                <span className="sidebar-add-child" style={{ visibility: "hidden" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></span>
              </button>
            </div>
          )}
          {!collapsed[-2] && renderCollections(null, 0, "archived")}
        </nav>
        <div className="sidebar-resize" onMouseDown={onResizeStart} onDoubleClick={() => setSidebarWidth(220)} />
      </aside>
    </div>
  );
}
