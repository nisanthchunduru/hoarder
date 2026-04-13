import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useClickOutside } from "../useClickOutside";
import { Collection } from "../interfaces";

export default function Breadcrumb({ collections, filterCollection }: {
  collections: (Collection & { id: number })[];
  filterCollection: number;
}) {
  const navigate = useNavigate();
  const [dropdownId, setDropdownId] = useState<number | null>(null);
  const close = useCallback(() => setDropdownId(null), []);
  const ref = useClickOutside<HTMLSpanElement>(dropdownId !== null, close);

  const crumbs: (Collection & { id: number })[] = [];
  let cur = collections.find(c => c.id === filterCollection);
  while (cur) {
    crumbs.unshift(cur as Collection & { id: number });
    cur = collections.find(c => c.id === cur!.parent_id);
  }

  if (!crumbs.length) return null;

  return (
    <nav className="breadcrumb">
      <span className="breadcrumb-item" onClick={() => navigate("/")}>All</span>
      {crumbs.map((c, i) => {
        const parentId = i === 0 ? null : crumbs[i - 1].id;
        const siblings = collections.filter(s => (s.parent_id ?? null) === (parentId ?? null));
        return (
          <span key={c.id}>
            <span className="breadcrumb-sep-wrap" ref={dropdownId === c.id ? ref : undefined}>
              <span className="breadcrumb-sep" onClick={() => setDropdownId(dropdownId === c.id ? null : c.id)}>›</span>
              {dropdownId === c.id && siblings.length > 1 && (
                <div className="breadcrumb-dropdown">
                  {siblings.map(s => (
                    <button key={s.id} className={s.id === c.id ? "active" : ""} onClick={() => { navigate(`/collections/${s.id}`); setDropdownId(null); }}>{s.name}</button>
                  ))}
                </div>
              )}
            </span>
            <span className={`breadcrumb-item${c.id === filterCollection ? " active" : ""}`} onClick={() => navigate(`/collections/${c.id}`)}>{c.name}</span>
          </span>
        );
      })}
    </nav>
  );
}
