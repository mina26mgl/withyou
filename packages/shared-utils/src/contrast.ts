const HEX_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/** Validates a hex color: "#173A24", or with opacity "#173A2480" (last 2 digits = alpha). */
export function isValidHexColor(hex: string): boolean {
  return HEX_RE.test(hex);
}

/** [r, g, b, a] with r/g/b in 0–255 and a in 0–1 (1 when the hex has no alpha). */
export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function hexToRgb(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgba(hex);
  return [r, g, b];
}

function toHex(channels: number[]): string {
  return `#${channels.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** The opaque color actually seen when `fg` (possibly translucent) is painted over `bg`. */
export function flattenOver(fg: string, bg: string): string {
  const [r, g, b, a] = hexToRgba(fg);
  const [br, bgG, bb] = hexToRgb(bg);
  return toHex([r * a + br * (1 - a), g * a + bgG * (1 - a), b * a + bb * (1 - a)]);
}

/** Multiplies a color's opacity (keeping any opacity it already has), e.g. for muted text. */
export function withOpacity(hex: string, factor: number): string {
  const [r, g, b, a] = hexToRgba(hex);
  return toHex([r, g, b, Math.max(0, Math.min(1, a * factor)) * 255]);
}

/** Relative luminance per WCAG 2.1 (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance). */
export function relativeLuminance(hex: string): number {
  const weights = [0.2126, 0.7152, 0.0722];
  return hexToRgb(hex).reduce((acc, channel, i) => {
    const v = channel / 255;
    const linear = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return acc + linear * weights[i];
  }, 0);
}

/** WCAG contrast ratio between two colors, from 1:1 (no contrast) to 21:1. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export interface BrandContrastResult {
  textRatio: number;
  accentRatio: number;
  ok: boolean;
}

/**
 * Checks a brand page color palette against WCAG AA: body text needs >= 4.5:1
 * against the background, titles/accents need >= 3:1 (large text threshold).
 */
export function checkBrandContrast(
  textColor: string,
  bgColor: string,
  accentColor: string,
  cardColor?: string,
): BrandContrastResult {
  // Translucent colors are judged as they are actually seen: the page background
  // over the white app, the section cards over it, then text and titles over the
  // surface they actually sit on — the cards when there are any.
  const bg = flattenOver(bgColor, '#FFFFFF');
  const surface = cardColor ? flattenOver(cardColor, bg) : bg;
  const textRatio = contrastRatio(flattenOver(textColor, surface), surface);
  const accentRatio = contrastRatio(flattenOver(accentColor, surface), surface);
  return { textRatio, accentRatio, ok: textRatio >= 4.5 && accentRatio >= 3 };
}
