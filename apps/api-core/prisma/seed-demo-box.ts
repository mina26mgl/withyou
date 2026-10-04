/**
 * Box Rituel d'exemple pour montrer l'écran « Box Rituel » de la console.
 * Toutes marquées demo = true.
 *
 *   pnpm --filter @withyou/api-core db:demo-box           # crée (remplace les précédentes)
 *   pnpm --filter @withyou/api-core db:demo-box --delete  # supprime les box de démo
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Abonnées prévues par type de peau (842 au total, comme dans le prototype). */
const VARIANTES: [string, number][] = [
  ['Peau mixte', 320],
  ['Peau sèche', 202],
  ['Peau grasse', 177],
  ['Peau sensible', 143],
];
const need = (variantes: string[]) => VARIANTES.filter(([t]) => variantes.includes(t)).reduce((a, [, n]) => a + n, 0);

type Line = { nom: string; marque: string; variantes: string[]; confirme: number; repondu: boolean; catalogue?: boolean };

const BOXES: {
  nom: string;
  mois: string;
  assemblage: string;
  expedition: string;
  statut: 'PREPARATION' | 'EXPEDIEE';
  produits: Line[];
  candidatures?: { marque: string; produit: string; variante: string }[];
}[] = [
  {
    nom: 'Box Rituel de septembre',
    mois: '2026-09-01',
    assemblage: '2026-08-28',
    expedition: '2026-09-01',
    statut: 'EXPEDIEE',
    produits: [
      { nom: 'Huile de figue de barbarie, mini 10 ml', marque: 'Azul Cosmetics', variantes: ['Peau sèche', 'Peau sensible'], confirme: 345, repondu: true },
      { nom: 'Savon au rhassoul', marque: 'Savon Namira', variantes: ['Peau grasse', 'Peau mixte'], confirme: 497, repondu: true },
      { nom: 'Brume visage à la rose', marque: 'Aryana Beauty', variantes: ['Peau mixte', 'Peau sèche', 'Peau grasse', 'Peau sensible'], confirme: 842, repondu: true },
    ],
  },
  {
    nom: "Box Rituel d'octobre",
    mois: '2026-10-01',
    assemblage: '2026-09-28',
    expedition: '2026-10-01',
    statut: 'PREPARATION',
    produits: [
      { nom: 'Azar, rituel nettoyant aux huiles précieuses', marque: 'Azul Cosmetics', variantes: ['Peau mixte', 'Peau grasse'], confirme: 120, repondu: true, catalogue: true },
      { nom: 'Thala, rituel hydratant', marque: 'Azul Cosmetics', variantes: ['Peau mixte'], confirme: 31, repondu: true },
      { nom: 'Brume visage à la rose', marque: 'Aryana Beauty', variantes: ['Peau sèche'], confirme: 250, repondu: true },
      { nom: 'Gel nettoyant doux', marque: 'Venus', variantes: ['Peau grasse', 'Peau sensible'], confirme: 400, repondu: true },
      { nom: 'Crème karité et miel', marque: 'Gateline', variantes: ['Peau sèche', 'Peau sensible'], confirme: 0, repondu: false },
      { nom: 'Masque argile', marque: 'Cosmétique Dihya', variantes: ['Peau grasse'], confirme: 180, repondu: true },
    ],
  },
  {
    nom: 'Box Rituel de novembre',
    mois: '2026-11-01',
    assemblage: '2026-10-28',
    expedition: '2026-11-01',
    statut: 'PREPARATION',
    produits: [],
    candidatures: [
      { marque: 'Azul Cosmetics', produit: 'Huile de figue de barbarie (mini 10 ml)', variante: 'Peau sèche' },
      { marque: 'Savon Namira', produit: 'Savon au rhassoul', variante: 'Peau grasse' },
      { marque: 'Gateline', produit: 'Baume lèvres au miel', variante: 'Toutes' },
    ],
  },
];

async function deleteDemo() {
  const { count } = await prisma.box_rituel.deleteMany({ where: { demo: true } });
  console.log(`Supprimé : ${count} box de démo (variantes, produits et candidatures avec).`);
}

async function create() {
  await deleteDemo();
  // Une vraie box sur le même mois n'est jamais écrasée.
  const taken = await prisma.box_rituel.findMany({ where: { mois: { in: BOXES.map((b) => new Date(b.mois)) } }, select: { nom: true } });
  if (taken.length) throw new Error(`Des box existent déjà pour ces mois : ${taken.map((t) => t.nom).join(', ')}.`);

  const azar = await prisma.produit.findFirst({ where: { nom: { startsWith: 'Azar' } }, select: { id_product: true } });
  const azul = await prisma.marque.findFirst({ select: { id_marque: true } });

  for (const b of BOXES) {
    await prisma.box_rituel.create({
      data: {
        nom: b.nom,
        mois: new Date(b.mois),
        date_assemblage: new Date(b.assemblage),
        date_expedition: new Date(b.expedition),
        statut: b.statut,
        demo: true,
        variantes: { create: VARIANTES.map(([type_peau, abonnees]) => ({ type_peau, abonnees })) },
        produits: {
          create: b.produits.map((p) => ({
            id_produit: p.catalogue ? (azar?.id_product ?? null) : null,
            nom_produit: p.nom,
            marque: p.marque,
            variantes: p.variantes,
            quantite_necessaire: need(p.variantes),
            quantite_confirmee: p.confirme,
            marque_a_repondu: p.repondu,
          })),
        },
        candidatures: {
          create: (b.candidatures ?? []).map((c) => ({
            marque: c.marque,
            id_marque: c.marque === 'Azul Cosmetics' ? (azul?.id_marque ?? null) : null,
            nom_produit: c.produit,
            variante: c.variante,
          })),
        },
      },
    });
  }
  console.log(`Créé : ${BOXES.map((b) => b.nom).join(', ')}.`);
}

(process.argv.includes('--delete') ? deleteDemo() : create())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
