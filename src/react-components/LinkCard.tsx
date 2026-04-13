import { useNavigate } from "react-router-dom";
import { Link, Collection, TagCount } from "../interfaces";
import { hostname, timeAgo } from "../utils";
import LinkTags from "./LinkTags";
import CardMenu from "./CardMenu";

export default function LinkCard({ link, collections, filterCollection, allTags }: {
  link: Link;
  collections: (Collection & { id: number })[];
  filterCollection?: number;
  allTags: TagCount[];
}) {
  const navigate = useNavigate();

  return (
    <li className="link-card" draggable
      onDragStart={e => { e.dataTransfer.setData("text/link-id", String(link.id)); e.dataTransfer.effectAllowed = "move"; }}
    >
      <div className="card-grip">
        <button className="copy-btn" title="Copy link" onClick={() => { navigator.clipboard.writeText(link.url); }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
        </button>
      </div>
      <div className="link-body">
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-main">
          <span className="link-title">{link.url}</span>
          <span className="link-meta">
            {hostname(link.url)} · {timeAgo(link.created_at)}
            {!filterCollection && link.collection_id && collections.find(c => c.id === link.collection_id) && (
              <> · <span className="link-collection" onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/collections/${link.collection_id}`); }}>{collections.find(c => c.id === link.collection_id)!.name}</span></>
            )}
          </span>
          {link.description && <span className="link-desc">{link.description}</span>}
        </a>
        <LinkTags link={link} allTags={allTags.map(t => t.name)} />
      </div>
      <CardMenu link={link} />
    </li>
  );
}
