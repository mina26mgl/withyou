import type { PrivacyRows } from '@withyou/shared-types';

/** No aggregate shared with a brand may describe fewer than this many customers. */
export const PRIVACY_MIN_GROUP = 20;

export interface GroupItem {
  label: string;
  consumerId: string | null;
}

/**
 * Turns individual observations into brand-safe percentages. Groups with fewer
 * than PRIVACY_MIN_GROUP distinct customers are never shown on their own; they
 * are folded into "Autres" (when allowed and that bucket is itself large
 * enough) or dropped. Anonymous observations cannot be counted as customers.
 */
export function groupWithPrivacyFloor(items: GroupItem[], withOthers: boolean): PrivacyRows {
  const groups = new Map<string, Set<string>>();
  const everyone = new Set<string>();

  for (const item of items) {
    if (!item.consumerId || !item.label) continue;
    everyone.add(item.consumerId);
    if (!groups.has(item.label)) groups.set(item.label, new Set());
    groups.get(item.label)!.add(item.consumerId);
  }

  if (everyone.size < PRIVACY_MIN_GROUP) {
    return { insufficient: true, minimum: PRIVACY_MIN_GROUP };
  }

  const qualified = [...groups.entries()]
    .filter(([, ids]) => ids.size >= PRIVACY_MIN_GROUP)
    .sort((a, b) => b[1].size - a[1].size);

  const small = new Set<string>();
  for (const [, ids] of groups) {
    if (ids.size < PRIVACY_MIN_GROUP) ids.forEach((id) => small.add(id));
  }

  const counted: { label: string; count: number }[] = qualified.map(([label, ids]) => ({ label, count: ids.size }));
  if (withOthers && small.size >= PRIVACY_MIN_GROUP) counted.push({ label: 'Autres', count: small.size });

  if (counted.length === 0) {
    return { insufficient: true, minimum: PRIVACY_MIN_GROUP };
  }

  const total = counted.reduce((sum, c) => sum + c.count, 0);
  return {
    insufficient: false,
    rows: counted.map((c) => ({ label: c.label, pct: Math.round((c.count / total) * 100) })),
  };
}
