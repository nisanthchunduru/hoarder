import { useState, useCallback } from "react";
import { useClickOutside } from "../useClickOutside";
import actions from "../actions";
import { Link } from "../interfaces";

export default function CardMenu({ link }: { link: Link }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(open, close);

  return (
    <div className="card-menu" ref={ref}>
      <button className="card-menu-trigger" onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="4" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="12" cy="8" r="1.2" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div className="card-menu-dropdown">
          <button onClick={() => { actions.archiveLink(link.id!); setOpen(false); }}>
            {link.archived ? "Unarchive" : "Archive"}
          </button>
          <button className="danger" onClick={() => { actions.deleteLink(link.id!); setOpen(false); }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
