import { useState, useEffect, useRef } from "react";
import actions from "../actions";
import { Link } from "../interfaces";
import Chip from "./Chip";

export default function LinkTags({ link }: {
  link: Link;
}) {
  const quickRemove = (t: string) => {
    const next = link.tags.filter(x => x !== t);
    actions.setTags(link.id!, next);
  };

  if (link.tags.length === 0) return null;

  return (
    <div className="tag-row">
      {link.tags.map(t => <Chip key={t} name={t} onRemove={() => quickRemove(t)} />)}
    </div>
  );
}

export function LinkTagEditor({ link, allTags, onClose }: {
  link: Link;
  allTags: string[];
  onClose: () => void;
}) {
  const [tags, setTags] = useState(link.tags);
  const [input, setInput] = useState("");
  const [hlIndex, setHlIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = input.trim().toLowerCase();
  const filtered = (query
    ? allTags.filter(s => s.includes(query))
    : allTags
  ).filter(s => !tags.includes(s)).slice(0, 6);

  useEffect(() => { setHlIndex(-1); }, [input]);
  useEffect(() => { setTags(link.tags); }, [link.tags]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      actions.setTags(link.id!, next);
    }
    setInput("");
    inputRef.current?.focus();
  };

  const removeTag = (t: string) => {
    const next = tags.filter(x => x !== t);
    setTags(next);
    actions.setTags(link.id!, next);
  };

  const cancel = () => { setTags(link.tags); setInput(""); onClose(); };
  const close = () => { setInput(""); onClose(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && filtered.length) { e.preventDefault(); setHlIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp" && filtered.length) { e.preventDefault(); setHlIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered.length && hlIndex >= 0) addTag(filtered[hlIndex]); else if (input.trim()) addTag(input); close(); }
    else if (e.key === "Tab" && input.trim()) { e.preventDefault(); addTag(input); }
    else if (e.key === "Tab" && !input.trim()) { close(); }
    else if (e.key === "," && input.trim()) { e.preventDefault(); addTag(input); }
    else if (e.key === "Backspace" && !input && tags.length) removeTag(tags[tags.length - 1]);
    else if (e.key === "Escape") cancel();
  };

  return (
    <>
      <div className="tag-popover-input-wrap">
        <svg className="tag-popover-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Add tag" aria-autocomplete="list" />
      </div>
      <div className="tag-popover-body">
        {tags.length > 0 && (
          <div className="tag-popover-section">
            <div className="tag-popover-chips">{tags.map(t => <Chip key={t} name={t} onRemove={() => removeTag(t)} />)}</div>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="tag-popover-section">
            <ul className="tag-popover-list" role="listbox">
              {filtered.map((s, i) => (
                <li key={s} role="option" aria-selected={i === hlIndex} className={`tag-popover-option${i === hlIndex ? " hl" : ""}`} onMouseDown={e => { e.preventDefault(); addTag(s); }} onMouseEnter={() => setHlIndex(i)}><Chip name={s} /></li>
              ))}
            </ul>
          </div>
        )}
        {query && !allTags.includes(query) && !tags.includes(query) && (
          <button className="tag-popover-create" onMouseDown={e => { e.preventDefault(); addTag(input); }}>Create "<strong>{query}</strong>"</button>
        )}
      </div>
    </>
  );
}
