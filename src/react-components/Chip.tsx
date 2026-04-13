import { tagColor } from "../utils";

export default function Chip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const c = tagColor(name);
  return (
    <span className="chip" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
      {name}
      {onRemove && (
        <button className="chip-x" onClick={e => { e.stopPropagation(); onRemove(); }} style={{ color: c.text }} aria-label={`Remove ${name}`}>×</button>
      )}
    </span>
  );
}
