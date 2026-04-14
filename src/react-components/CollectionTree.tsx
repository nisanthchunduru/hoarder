import { useState } from "react";
import { useNavigate } from "react-router-dom";
import actions from "../actions";
import { Collection } from "../interfaces";

type Section = "active" | "archived";

export default function CollectionTree({ collections, filterCollection, isArchivedSection, section, parentId, depth, collapsed, toggleCollapse, hasArchivedDescendant }: {
  collections: (Collection & { id: number })[];
  filterCollection?: number;
  isArchivedSection?: boolean;
  section: Section;
  parentId: number | null;
  depth: number;
  collapsed: Record<string, boolean>;
  toggleCollapse: (key: string) => void;
  hasArchivedDescendant: (id: number) => boolean;
}) {
  const navigate = useNavigate();
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [newCollectionParent, setNewCollectionParent] = useState<number | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);

  const startNew = (pid: number | null) => { setNewCollectionParent(pid); setShowNewCollection(true); };
  const cancelNew = () => { setNewCollection(""); setShowNewCollection(false); setNewCollectionParent(null); };

  const handleNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.trim()) return;
    await actions.createCollection(newCollection.trim(), newCollectionParent || undefined);
    cancelNew();
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.currentTarget.classList.remove("drop-over");
    const linkId = e.dataTransfer.getData("text/link-id");
    const collId = e.dataTransfer.getData("text/collection-id");
    if (linkId) actions.setCollection(+linkId, targetId);
    else if (collId && +collId !== targetId) actions.moveCollection(+collId, targetId);
  };

  const children = collections.filter(c => {
    if ((c.parent_id ?? null) !== parentId) return false;
    if (section === "active") return !c.archived;
    return c.archived || hasArchivedDescendant(c.id);
  });

  return (
    <>
      {children.map(c => {
        const collapseKey = `${section}:${c.id}`;
        const isCollapsed = collapsed[collapseKey];
        const isContextOnly = section === "archived" && !c.archived;
        const isActive = filterCollection === c.id && (section === "archived" === !!isArchivedSection);
        const hasChildren = collections.some(ch => ch.parent_id === c.id);

        return (
          <div key={c.id}>
            <div className="sidebar-item-row" style={{ paddingLeft: 12 + depth * 16 }}>
              <button
                className={`sidebar-item${isActive ? " active" : ""}${isContextOnly ? " context-only" : ""}`}
                draggable={renamingId !== c.id && !isContextOnly}
                onClick={() => {
                  if (renamingId === c.id) return;
                  const prefix = section === "archived" ? "/archived" : "";
                  navigate(filterCollection === c.id ? (section === "archived" ? "/archived" : "/") : `${prefix}/collections/${c.id}`);
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  const prefix = section === "archived" ? "/archived" : "";
                  navigate(`${prefix}/collections/${c.id}`);
                  setRenamingId(c.id);
                  setRenameValue(c.name);
                }}
                onDragStart={e => { e.dataTransfer.setData("text/collection-id", String(c.id)); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={e => e.preventDefault()}
                onDragEnter={e => e.currentTarget.classList.add("drop-over")}
                onDragLeave={e => e.currentTarget.classList.remove("drop-over")}
                onDrop={e => handleDrop(e, c.id)}
              >
                {hasChildren ? (
                  <span className={`sidebar-chevron${isCollapsed ? "" : " open"}`} onClick={e => { e.stopPropagation(); toggleCollapse(collapseKey); }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                ) : <span className="sidebar-chevron" style={{ visibility: "hidden" }} />}
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
                <span className="sidebar-add-child" title="Add sub-collection" style={section === "archived" ? { visibility: "hidden" } : undefined} onClick={e => { e.stopPropagation(); startNew(c.id); }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </span>
              </button>
            </div>
            {showNewCollection && newCollectionParent === c.id && (
              <form onSubmit={handleNew} className="sidebar-new-form" style={{ paddingLeft: 12 + (depth + 1) * 16 }}>
                <input value={newCollection} onChange={e => setNewCollection(e.target.value)} placeholder="Sub-collection name" autoFocus onBlur={() => { if (!newCollection.trim()) cancelNew(); }} onKeyDown={e => { if (e.key === "Escape") cancelNew(); }} />
              </form>
            )}
            {!isCollapsed && (
              <CollectionTree
                collections={collections} filterCollection={filterCollection} isArchivedSection={isArchivedSection}
                section={section} parentId={c.id} depth={depth + 1}
                collapsed={collapsed} toggleCollapse={toggleCollapse} hasArchivedDescendant={hasArchivedDescendant}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
