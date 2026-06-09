import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link, Collection, TagCount } from "../interfaces";
import { formatAddedDate, hostname } from "../utils";
import actions from "../actions";
import LinkTags from "./LinkTags";
import CardMenu from "./CardMenu";

export default function LinkCard({ link, collections, filterCollection, allTags }: {
  link: Link;
  collections: (Collection & { id: number })[];
  filterCollection?: number;
  allTags: TagCount[];
}) {
  const navigate = useNavigate();
  const [editingTags, setEditingTags] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const cardRef = useRef<HTMLLIElement>(null);
  const editPopoverRef = useRef<HTMLDivElement>(null);
  const title = link.title.trim();
  const showTitle = title && title !== link.url;

  const toggleEditLink = () => {
    if (editingLink) { setEditingLink(false); return; }
    setEditingTags(false);
    setTitleValue(showTitle ? title : "");
    setUrlValue(link.url);
    setEditingLink(true);
  };

  const saveLink = () => {
    if (!urlValue.trim()) return;
    actions.updateLinkDetails(link.id!, { title: titleValue, url: urlValue });
    setEditingLink(false);
  };

  useEffect(() => {
    if (!editingLink) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const card = cardRef.current;
      const popover = editPopoverRef.current;
      const cardActions = card?.querySelector(".link-card-actions");
      if (popover?.contains(target) || cardActions?.contains(target)) return;
      setEditingLink(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editingLink]);

  useEffect(() => {
    if (!editingTags) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const card = cardRef.current;
      const tagPopover = card?.querySelector(".tag-popover-anchor");
      const cardActions = card?.querySelector(".link-card-actions");
      if (tagPopover?.contains(target) || cardActions?.contains(target)) return;
      setEditingTags(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editingTags]);

  return (
    <li className="link-card" ref={cardRef} draggable
      onDragStart={e => { e.dataTransfer.setData("text/link-id", String(link.id)); e.dataTransfer.effectAllowed = "move"; }}
    >
      <div className="link-body">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-main">
          <span className="link-heading">
            {showTitle ? (
              <>
                <span className="link-title">{title}</span>
                <span className="link-title-bullet" aria-hidden="true">&bull;</span>
              </>
            ) : null}
            <span className="link-url">{link.url}</span>
          </span>
          <span className="link-meta">
            {hostname(link.url)} · {formatAddedDate(link.created_at)}
            {!filterCollection && link.collection_id && collections.find(c => c.id === link.collection_id) && (
              <> · <span className="link-collection" onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/collections/${link.collection_id}`); }}>{collections.find(c => c.id === link.collection_id)!.name}</span></>
            )}
          </span>
          {link.description && <span className="link-desc">{link.description}</span>}
        </a>
        <LinkTags link={link} allTags={allTags.map(t => t.name)} editing={editingTags} onEditingChange={setEditingTags} />
      </div>
      {editingLink && (
        <div className="link-edit-popover" ref={editPopoverRef}>
          <form
            onSubmit={e => { e.preventDefault(); saveLink(); }}
            onKeyDown={e => { if (e.key === "Escape") setEditingLink(false); }}
          >
            <label className="link-edit-field">
              <span className="link-edit-input-wrap">
                <svg className="link-edit-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M5.8 4.2l.7-.7a2.5 2.5 0 0 1 3.5 3.5l-1.2 1.2a2.5 2.5 0 0 1-3.5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M8.2 9.8l-.7.7A2.5 2.5 0 0 1 4 7l1.2-1.2a2.5 2.5 0 0 1 3.5 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input
                  type="url"
                  placeholder="Link"
                  value={urlValue}
                  onChange={e => setUrlValue(e.target.value)}
                  required
                  autoFocus
                />
              </span>
            </label>
            <label className="link-edit-field">
              <span className="link-edit-input-wrap">
                <svg className="link-edit-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 3.25h8M7 3.25v7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={titleValue}
                  placeholder="Title (optional)"
                  onChange={e => setTitleValue(e.target.value)}
                />
              </span>
            </label>
            <div className="link-edit-actions">
              <button type="button" className="link-edit-cancel" onClick={() => setEditingLink(false)}>Cancel</button>
              <button type="submit" className="link-edit-save" disabled={!urlValue.trim()}>Save</button>
            </div>
          </form>
        </div>
      )}
      <div className="link-card-actions">
        <button type="button" className="link-card-action" title="Copy link" aria-label="Copy link" onClick={() => { navigator.clipboard.writeText(link.url); }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
        <button
          type="button"
          className={`link-card-action link-card-action-title${editingLink ? " active" : ""}`}
          title="Edit link"
          aria-label="Edit link"
          onClick={toggleEditLink}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10.9 2.6a1.5 1.5 0 1 1 2.1 2.1l-7 7-2.8.7.7-2.8 7-7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <path d="M9.8 3.7l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
        <button type="button" className={`link-card-action${editingTags ? " active" : ""}`} title="Add label" aria-label="Add label" onClick={() => { setEditingLink(false); setEditingTags(open => !open); }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2.5 8.1V3.6c0-.6.5-1.1 1.1-1.1h4.5c.3 0 .6.1.8.3l4.4 4.4c.4.4.4 1.1 0 1.6l-4.5 4.5c-.4.4-1.1.4-1.6 0L2.8 8.9c-.2-.2-.3-.5-.3-.8Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            <circle cx="5.2" cy="5.2" r="0.8" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <CardMenu link={link} />
    </li>
  );
}
