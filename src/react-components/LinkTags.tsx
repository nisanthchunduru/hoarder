import { useState, useEffect, useRef } from "react";
import actions from "../actions";
import { Link } from "../interfaces";
import Chip from "./Chip";

export default function LinkTags({ link, allTags }: { link: Link; allTags: string[] }) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState(link.tags);
  const [input, setInput] = useState("");
  const [hlIndex, setHlIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.trim()
    ? allTags.filter(s => s.includes(input.trim().toLowerCase()) && !tags.includes(s)).slice(0, 6)
    : [];

  useEffect(() => { setHlIndex(-1); }, [input]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

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

  const cancel = () => { setTags(link.tags); setEditing(false); setInput(""); };
  const close = () => { setEditing(false); setInput(""); };

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

  if (!editing) {
    const quickRemove = (t: string) => {
      const next = link.tags.filter(x => x !== t);
      setTags(next);
      actions.setTags(link.id!, next);
    };
    return (
      <div className="tag-row">
        {link.tags.map(t => <Chip key={t} name={t} onRemove={() => quickRemove(t)} />)}
        <button className="add-tag-btn" onClick={() => setEditing(true)}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add tag
        </button>
      </div>
    );
  }

  return (
    <div className="tag-popover-anchor">
      <div className="tag-row">
        {link.tags.map(t => <Chip key={t} name={t} />)}
        <button className="add-tag-btn active" onClick={cancel}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add tag
        </button>
      </div>
      <div className="tag-popover">
        <div className="tag-popover-header">
          <span className="tag-popover-title">Tags</span>
          <button className="tag-popover-close" onClick={cancel}>✕</button>
        </div>
        <div className="tag-popover-input-wrap">
          <svg className="tag-popover-search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Search or create tag  ⏎ done · ⇥ add more" aria-autocomplete="list" />
        </div>
        <div className="tag-popover-body">
          {tags.length > 0 && (
            <div className="tag-popover-section">
              <div className="tag-popover-chips">{tags.map(t => <Chip key={t} name={t} onRemove={() => removeTag(t)} />)}</div>
            </div>
          )}
          {filtered.length > 0 && (
            <div className="tag-popover-section">
              <span className="tag-popover-label">Suggestions</span>
              <ul className="tag-popover-list" role="listbox">
                {filtered.map((s, i) => (
                  <li key={s} role="option" aria-selected={i === hlIndex} className={`tag-popover-option${i === hlIndex ? " hl" : ""}`} onMouseDown={e => { e.preventDefault(); addTag(s); }} onMouseEnter={() => setHlIndex(i)}><Chip name={s} /></li>
                ))}
              </ul>
            </div>
          )}
          {input.trim() && !filtered.includes(input.trim().toLowerCase()) && !tags.includes(input.trim().toLowerCase()) && (
            <button className="tag-popover-create" onMouseDown={e => { e.preventDefault(); addTag(input); }}>Create "<strong>{input.trim().toLowerCase()}</strong>"</button>
          )}
        </div>
      </div>
    </div>
  );
}
