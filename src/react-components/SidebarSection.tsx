import { useNavigate } from "react-router-dom";
import { Collection } from "../interfaces";
import CollectionTree from "./CollectionTree";

type Section = "active" | "archived";

const ChevronSvg = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

const PlusSvg = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
);

export default function SidebarSection({ label, section, allLabel, allPath, isActive, collections, filterCollection, isArchivedSection, collapsed, toggleCollapse, collapseKey, hasArchivedDescendant, onAddCollection, showNewForm, onNewSubmit, newValue, onNewChange, onNewCancel, droppable }: {
  label: string;
  section: Section;
  allLabel: string;
  allPath: string;
  isActive: boolean;
  collections: (Collection & { id: number })[];
  filterCollection?: number;
  isArchivedSection?: boolean;
  collapsed: Record<string, boolean>;
  toggleCollapse: (key: string) => void;
  collapseKey: string;
  hasArchivedDescendant: (id: number) => boolean;
  onAddCollection?: () => void;
  showNewForm?: boolean;
  onNewSubmit?: (e: React.FormEvent) => void;
  newValue?: string;
  onNewChange?: (v: string) => void;
  onNewCancel?: () => void;
  droppable?: (e: React.DragEvent) => void;
}) {
  const navigate = useNavigate();
  const isCollapsed = collapsed[collapseKey];

  return (
    <>
      <span className="sidebar-label">{label}</span>
      <div className="sidebar-item-row">
        <button
          className={`sidebar-item${isActive ? " active" : ""}`}
          onClick={() => navigate(allPath)}
          onDragOver={droppable ? (e => e.preventDefault()) : undefined}
          onDragEnter={droppable ? (e => e.currentTarget.classList.add("drop-over")) : undefined}
          onDragLeave={droppable ? (e => e.currentTarget.classList.remove("drop-over")) : undefined}
          onDrop={droppable}
        >
          <span className={`sidebar-chevron${isCollapsed ? "" : " open"}`} onClick={e => { e.stopPropagation(); toggleCollapse(collapseKey); }}>
            <ChevronSvg />
          </span>
          {allLabel}
          {onAddCollection ? (
            <span className="sidebar-add-child" title="New collection" onClick={e => { e.stopPropagation(); onAddCollection(); }}>
              <PlusSvg />
            </span>
          ) : (
            <span className="sidebar-add-child" style={{ visibility: "hidden" }}><PlusSvg /></span>
          )}
        </button>
      </div>
      {showNewForm && onNewSubmit && (
        <form onSubmit={onNewSubmit} className="sidebar-new-form">
          <input value={newValue} onChange={e => onNewChange?.(e.target.value)} placeholder="Collection name" autoFocus onBlur={() => { if (!newValue?.trim()) onNewCancel?.(); }} onKeyDown={e => { if (e.key === "Escape") onNewCancel?.(); }} />
        </form>
      )}
      {!isCollapsed && (
        <CollectionTree
          collections={collections} filterCollection={filterCollection} isArchivedSection={isArchivedSection}
          section={section} parentId={null} depth={0}
          collapsed={collapsed} toggleCollapse={toggleCollapse} hasArchivedDescendant={hasArchivedDescendant}
        />
      )}
    </>
  );
}
