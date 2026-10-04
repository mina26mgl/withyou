import { cn } from "@/lib/utils";

type Shape = "pump" | "dropper" | "bar" | "jar";

const PALETTE: { color: string; tint: string }[] = [
  { color: "#C98B3A", tint: "#F4E7D4" },
  { color: "#D8C3A3", tint: "#F7F1E8" },
  { color: "#C97C7C", tint: "#F8E4E2" },
  { color: "#E0AE4E", tint: "#FBF0D9" },
  { color: "#4A4A3F", tint: "#E6E9E1" },
  { color: "#8A5A9E", tint: "#EEE6F2" },
  { color: "#5E8C7B", tint: "#E3EFEA" },
];

function shapeFor(category: string | null | undefined): Shape {
  const c = (category ?? "").toLowerCase();
  if (c.includes("nettoyant")) return "pump";
  if (c.includes("sérum") || c.includes("serum") || c.includes("huile")) return "dropper";
  if (c.includes("savon")) return "bar";
  return "jar";
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

const SHAPES: Record<Shape, (c: string) => React.ReactNode> = {
  dropper: (c) => (
    <>
      <rect x="29" y="36" width="22" height="32" rx="6" fill={c} />
      <rect x="34" y="27" width="12" height="10" rx="2" fill="#2E2A26" />
      <ellipse cx="40" cy="20" rx="5" ry="8" fill="#2E2A26" />
      <rect x="32" y="46" width="16" height="10" rx="2" fill="#fff" opacity=".75" />
    </>
  ),
  pump: (c) => (
    <>
      <rect x="26" y="30" width="28" height="40" rx="8" fill={c} />
      <rect x="36" y="17" width="8" height="14" rx="2" fill="#2E2A26" />
      <rect x="42" y="17" width="12" height="4" rx="2" fill="#2E2A26" />
      <rect x="31" y="44" width="18" height="12" rx="2" fill="#fff" opacity=".75" />
    </>
  ),
  bar: (c) => (
    <>
      <rect x="15" y="34" width="50" height="26" rx="12" fill={c} />
      <rect x="22" y="40" width="36" height="4" rx="2" fill="#fff" opacity=".25" />
    </>
  ),
  jar: (c) => (
    <>
      <rect x="19" y="42" width="42" height="26" rx="7" fill={c} />
      <rect x="17" y="33" width="46" height="11" rx="4" fill="#2E2A26" />
      <rect x="26" y="50" width="28" height="9" rx="2" fill="#fff" opacity=".75" />
    </>
  ),
};

/**
 * Product picture. Falls back to a generated bottle illustration (shape from
 * the category, colour from the name) so a product without photos still looks
 * intentional, as in the prototype.
 */
export function ProductVisual({
  imageUrl,
  category,
  name,
  className,
}: {
  imageUrl?: string | null;
  category?: string | null;
  name: string;
  className?: string;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={cn("block h-full w-full object-cover", className)} />;
  }
  const { color, tint } = PALETTE[hash(name) % PALETTE.length];
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className={cn("block h-full w-full", className)}>
      <rect width="80" height="80" fill={tint} />
      {SHAPES[shapeFor(category)](color)}
    </svg>
  );
}
