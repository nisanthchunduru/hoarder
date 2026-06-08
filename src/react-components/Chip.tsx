import { tagColor } from "../utils";

export default function Chip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  const hue = tagColor(name);
  return (
    <span className="chip" style={{ "--chip-hue": hue } as React.CSSProperties}>
      {name}
      {onRemove && (
        <button className="chip-x" onClick={e => { e.stopPropagation(); onRemove(); }} aria-label={`Remove ${name}`}>×</button>
      )}
    </span>
  );
}
