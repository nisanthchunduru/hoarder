import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useClickOutside } from "../useClickOutside";
import actions from "../actions";
import { exportData } from "../export";
import { importData } from "../import";
import { Collection } from "../interfaces";
import SidebarSection from "./SidebarSection";

export default function Sidebar({ collections, filterCollection, isArchivedSection }: {
  collections: (Collection & { id: number })[];
  filterCollection?: number;
  isArchivedSection?: boolean;
}) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("sidebarCollapsed") || "{}"); } catch { return {}; }
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("sidebarWidth")) || 220);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);

  const closeLogo = useCallback(() => setLogoMenuOpen(false), []);
  const logoMenuRef = useClickOutside<HTMLDivElement>(logoMenuOpen, closeLogo);

  useEffect(() => { localStorage.setItem("sidebarWidth", String(sidebarWidth)); }, [sidebarWidth]);
  useEffect(() => { localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed)); }, [collapsed]);

  const toggleCollapse = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const hasArchivedDescendant = (id: number): boolean => {
    return collections.some(c => c.parent_id === id && (c.archived || hasArchivedDescendant(c.id!)));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drop-over");
    const linkId = e.dataTransfer.getData("text/link-id");
    const collId = e.dataTransfer.getData("text/collection-id");
    if (linkId) actions.setCollection(+linkId, null);
    else if (collId) actions.moveCollection(+collId, null);
  };

  const handleNewCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.trim()) return;
    await actions.createCollection(newCollection.trim());
    setNewCollection("");
    setShowNewCollection(false);
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

  const hasPinned = collections.some(c => c.pinned && !c.archived);
  const hasArchived = collections.some(c => c.archived);

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
          {hasPinned && (
            <>
              <span className="sidebar-label">Pinned Collections</span>
              {collections.filter(c => c.pinned && !c.archived).map(c => (
                <div key={c.id} className="sidebar-item-row">
                  <button
                    className={`sidebar-item${filterCollection === c.id && !isArchivedSection ? " active" : ""}`}
                    onClick={() => navigate(`/collections/${c.id}`)}
                  >
                    {c.name}
                  </button>
                </div>
              ))}
            </>
          )}

          <SidebarSection
            label="Collections" section="active" allLabel="All" allPath="/"
            isActive={!filterCollection && !isArchivedSection}
            collections={collections} filterCollection={filterCollection} isArchivedSection={isArchivedSection}
            collapsed={collapsed} toggleCollapse={toggleCollapse} collapseKey="active:-1"
            hasArchivedDescendant={hasArchivedDescendant}
            onAddCollection={() => setShowNewCollection(true)}
            showNewForm={showNewCollection} onNewSubmit={handleNewCollection}
            newValue={newCollection} onNewChange={setNewCollection} onNewCancel={() => { setNewCollection(""); setShowNewCollection(false); }}
            droppable={handleDrop}
          />

          {hasArchived && (
            <SidebarSection
              label="Archived Collections" section="archived" allLabel="All" allPath="/archived"
              isActive={!!isArchivedSection && !filterCollection}
              collections={collections} filterCollection={filterCollection} isArchivedSection={isArchivedSection}
              collapsed={collapsed} toggleCollapse={toggleCollapse} collapseKey="archived:-1"
              hasArchivedDescendant={hasArchivedDescendant}
            />
          )}
        </nav>
        <div className="sidebar-resize" onMouseDown={onResizeStart} onDoubleClick={() => setSidebarWidth(220)} />
      </aside>
    </div>
  );
}
