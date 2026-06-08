export const TAG_HUES = [0, 24, 48, 142, 188, 218, 262, 332];

export function tagColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TAG_HUES[Math.abs(h) % TAG_HUES.length];
}

export function hostname(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

export function formatAddedDate(d: string) {
  return new Date(d + "Z").toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
