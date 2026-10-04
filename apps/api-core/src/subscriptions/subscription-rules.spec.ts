import { addPeriod, statusOf } from './subscription-rules';

describe('subscription rules', () => {
  it('ends a monthly subscription one month later, a yearly one a year later', () => {
    const start = new Date('2026-09-25T10:00:00Z');
    expect(addPeriod(start, 'MENSUEL').toISOString()).toBe('2026-10-25T10:00:00.000Z');
    expect(addPeriod(start, 'ANNUEL').toISOString()).toBe('2027-09-25T10:00:00.000Z');
  });
  it('reports an active subscription past its end date as expired', () => {
    const now = new Date('2026-09-25');
    expect(statusOf({ statut: 'ACTIF', fin: new Date('2026-10-01') }, now)).toBe('ACTIF');
    expect(statusOf({ statut: 'ACTIF', fin: new Date('2026-09-01') }, now)).toBe('EXPIRE');
    expect(statusOf({ statut: 'DEMANDE', fin: null }, now)).toBe('DEMANDE');
  });
});
