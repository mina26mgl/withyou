import type { OrderStep } from '@withyou/shared-types';

interface StepInputs {
  paymentMode: string;
  paymentStatus: string | null;
  pickups: { received: boolean }[];
  delivery: { date_expidition: Date | null; date_livraison: Date | null } | null;
}

/** Paiement à la livraison : la collecte démarre sans attendre de paiement. */
export const isCashOnDelivery = (mode: string) => /livraison/i.test(mode);

/**
 * Étape d'une commande, déduite de ses données (jamais stockée) :
 * livrée → chez le livreur → contrôle et emballage (tout reçu des marques)
 * → collecte (payée, ou paiement à la livraison) → confirmée.
 */
export function orderStep({ paymentMode, paymentStatus, pickups, delivery }: StepInputs): OrderStep {
  if (delivery?.date_livraison) return 4;
  if (delivery?.date_expidition) return 3;
  if (pickups.length > 0 && pickups.every((p) => p.received)) return 2;
  if (paymentStatus === 'confirme' || isCashOnDelivery(paymentMode)) return 1;
  return 0;
}
