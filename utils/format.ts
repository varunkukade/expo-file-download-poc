export function truncate(name: string, maxLength: number = 40) {
  if (name.length <= maxLength) return name;

  const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")) : "";
  const keep = maxLength - ext.length - 3; // space for "..."
  const start = name.substring(0, Math.ceil(keep / 2));
  const end = name.substring(name.length - Math.floor(keep / 2));

  return `${start}...${end}${ext}`;
}
