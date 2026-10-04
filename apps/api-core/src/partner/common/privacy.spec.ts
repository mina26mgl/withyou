import { groupWithPrivacyFloor, PRIVACY_MIN_GROUP } from './privacy';

function many(label: string, n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({ label, consumerId: `${prefix}-${i}` }));
}

describe('groupWithPrivacyFloor', () => {
  it('reports "not enough data" below 20 customers overall', () => {
    const result = groupWithPrivacyFloor(many('Mixte', PRIVACY_MIN_GROUP - 1, 'a'), false);
    expect(result).toEqual({ insufficient: true, minimum: PRIVACY_MIN_GROUP });
  });

  it('counts distinct customers, not events', () => {
    const repeated = Array.from({ length: 200 }, () => ({ label: 'Mixte', consumerId: 'same-person' }));
    expect(groupWithPrivacyFloor(repeated, false).insufficient).toBe(true);
  });

  it('ignores anonymous observations', () => {
    const anon = Array.from({ length: 50 }, () => ({ label: 'Mixte', consumerId: null }));
    expect(groupWithPrivacyFloor(anon, false).insufficient).toBe(true);
  });

  it('never exposes a group smaller than 20 on its own', () => {
    const items = [...many('Mixte', 30, 'm'), ...many('Sèche', 25, 's'), ...many('Sensible', 5, 'x')];
    const result = groupWithPrivacyFloor(items, false);
    expect(result.insufficient).toBe(false);
    if (!result.insufficient) {
      expect(result.rows.map((r) => r.label)).toEqual(['Mixte', 'Sèche']);
    }
  });

  it('folds small groups into "Autres" only when that bucket is itself >= 20', () => {
    const items = [
      ...many('Alger', 40, 'a'),
      ...many('Oran', 12, 'o'),
      ...many('Blida', 12, 'b'),
    ];
    const result = groupWithPrivacyFloor(items, true);
    expect(result.insufficient).toBe(false);
    if (!result.insufficient) {
      expect(result.rows.map((r) => r.label)).toEqual(['Alger', 'Autres']);
    }
  });

  it('drops a small "Autres" bucket instead of exposing it', () => {
    const items = [...many('Alger', 40, 'a'), ...many('Oran', 8, 'o')];
    const result = groupWithPrivacyFloor(items, true);
    expect(result.insufficient).toBe(false);
    if (!result.insufficient) {
      expect(result.rows.map((r) => r.label)).toEqual(['Alger']);
    }
  });
});
