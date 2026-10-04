import { orderStep } from './order-step';

const base = { paymentMode: 'CIB', paymentStatus: 'en_attente', pickups: [{ received: false }], delivery: null };
const d = new Date('2026-09-20');

describe('orderStep', () => {
  it('stays « Confirmée » while a card payment is not confirmed', () => {
    expect(orderStep(base)).toBe(0);
  });
  it('moves to « Collecte » once paid, or straight away for cash on delivery', () => {
    expect(orderStep({ ...base, paymentStatus: 'confirme' })).toBe(1);
    expect(orderStep({ ...base, paymentMode: 'À la livraison', paymentStatus: null })).toBe(1);
  });
  it('is « Contrôle et emballage » only when every brand has handed over its items', () => {
    expect(orderStep({ ...base, paymentStatus: 'confirme', pickups: [{ received: true }, { received: false }] })).toBe(1);
    expect(orderStep({ ...base, paymentStatus: 'confirme', pickups: [{ received: true }, { received: true }] })).toBe(2);
  });
  it('follows the delivery: shipped, then delivered', () => {
    expect(orderStep({ ...base, delivery: { date_expidition: d, date_livraison: null } })).toBe(3);
    expect(orderStep({ ...base, delivery: { date_expidition: d, date_livraison: d } })).toBe(4);
  });
});
