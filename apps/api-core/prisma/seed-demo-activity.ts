import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

/** Deterministic PRNG so the demo data is the same on every machine. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rand: () => number, items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

const DAY = 24 * 60 * 60 * 1000;

const WILAYAS = [
  { value: 'Alger', weight: 41 },
  { value: 'Tizi Ouzou', weight: 19 },
  { value: 'Oran', weight: 14 },
  { value: 'Béjaïa', weight: 9 },
  { value: 'Blida', weight: 6 },
  { value: 'Sétif', weight: 4 },
  { value: 'Constantine', weight: 4 },
  { value: 'Annaba', weight: 3 },
];

const SKINS = [
  { value: 'Mixte', weight: 38 },
  { value: 'Sèche', weight: 24 },
  { value: 'Grasse', weight: 21 },
  { value: 'Sensible', weight: 17 },
];

const FIRST_NAMES = ['Asma', 'Lina', 'Meriem', 'Kenza', 'Yasmine', 'Nadia', 'Sonia', 'Amel', 'Rania', 'Samira', 'Lydia', 'Sarah'];
const LAST_INITIALS = ['B', 'K', 'S', 'M', 'R', 'H', 'A', 'D', 'T'];

const SEARCHES = [
  { value: 'démaquillant naturel', weight: 312 },
  { value: 'huile de figue de barbarie', weight: 268 },
  { value: 'crème peau sèche bio', weight: 190 },
  { value: 'savon noir', weight: 174 },
  { value: 'sérum taches', weight: 96 },
];

interface ProductSpec {
  key: string;
  nom: string;
  categorySlug: string;
  prix: number;
  size: string;
  stock: number;
  status: 'ONLINE' | 'IN_REVIEW';
  skins: string[];
  needs: string[];
  moment: string;
  description: string;
  inci: string[];
  image: string | null;
  /** How often this product sells / is opened / is kept, relative to the others. */
  sellWeight: number;
  openWeight: number;
  keepWeight: number;
}

const AZUL_PRODUCTS: ProductSpec[] = [
  {
    key: 'azar',
    nom: 'Azar, rituel nettoyant et démaquillant aux huiles',
    categorySlug: 'nettoyant',
    prix: 2800,
    size: '150 ml',
    stock: 48,
    status: 'ONLINE',
    skins: ['Mixte', 'Sèche'],
    needs: ['Éclat'],
    moment: 'Soir',
    description: "Une huile démaquillante qui fond au contact de l'eau et emporte maquillage et impuretés sans tirailler.",
    inci: ['Olea Europaea Fruit Oil', 'Prunus Amygdalus Dulcis Oil', 'Polyglyceryl-4 Oleate', 'Tocopherol'],
    image: '/azul-product.webp',
    sellWeight: 12,
    openWeight: 20,
    keepWeight: 22,
  },
  {
    key: 'thala',
    nom: 'Thala, rituel hydratant visage',
    categorySlug: 'creme-et-hydratant',
    prix: 2800,
    size: '50 ml',
    stock: 31,
    status: 'ONLINE',
    skins: ['Mixte', 'Normale'],
    needs: ['Hydratation'],
    moment: 'Les deux',
    description: "Une crème légère à l'eau de rose et à l'huile d'argan pour les peaux qui tiraillent en fin de journée.",
    inci: [],
    image: '/ivoire-product.svg',
    sellWeight: 9,
    openWeight: 34,
    keepWeight: 3,
  },
  {
    key: 'serum',
    nom: "Sérum éclat à l'huile de rose musquée",
    categorySlug: 'serum',
    prix: 3200,
    size: '30 ml',
    stock: 12,
    status: 'ONLINE',
    skins: ['Sèche', 'Normale'],
    needs: ['Éclat', 'Taches'],
    moment: 'Soir',
    description: 'Quelques gouttes le soir pour un teint plus uniforme et lumineux.',
    inci: ['Rosa Canina Fruit Oil', 'Tocopherol'],
    image: '/dihya-product.jpg',
    sellWeight: 8,
    openWeight: 16,
    keepWeight: 18,
  },
  {
    key: 'karite',
    nom: 'Crème nourrissante au karité et miel',
    categorySlug: 'creme-et-hydratant',
    prix: 2500,
    size: '50 ml',
    stock: 0,
    status: 'ONLINE',
    skins: ['Sèche', 'Sensible'],
    needs: ['Hydratation'],
    moment: 'Soir',
    description: 'Un baume riche pour les peaux sèches et sensibles.',
    inci: ['Butyrospermum Parkii Butter', 'Mel', 'Cera Alba'],
    image: '/gateline-product.jpg',
    sellWeight: 6,
    openWeight: 12,
    keepWeight: 14,
  },
  {
    key: 'savon',
    nom: "Savon noir à l'eucalyptus",
    categorySlug: 'savon',
    prix: 900,
    size: '200 g',
    stock: 120,
    status: 'ONLINE',
    skins: ['Grasse', 'Mixte'],
    needs: ['Pores dilatés', 'Imperfections'],
    moment: 'Matin',
    description: 'Le savon noir traditionnel, adouci à l’eucalyptus, pour le hammam ou la douche.',
    inci: ['Potassium Olivate', 'Eucalyptus Globulus Leaf Oil'],
    image: null,
    sellWeight: 22,
    openWeight: 18,
    keepWeight: 24,
  },
  {
    key: 'huile',
    nom: 'Huile de figue de barbarie',
    categorySlug: 'huile',
    prix: 4500,
    size: '30 ml',
    stock: 20,
    status: 'IN_REVIEW',
    skins: ['Sèche', 'Normale'],
    needs: ['Rides', 'Éclat'],
    moment: 'Soir',
    description: 'Pressée à froid, riche en vitamine E.',
    inci: ['Opuntia Ficus-Indica Seed Oil'],
    image: null,
    sellWeight: 0,
    openWeight: 0,
    keepWeight: 0,
  },
];

const REVIEW_TEXTS_5 = [
  "Des soins d'une qualité exceptionnelle, on sent vraiment les rituels algériens dans chaque produit.",
  'Ma peau est plus douce dès la première semaine. Je recommande sans hésiter.',
  'Texture agréable, ça pénètre vite et ça ne laisse pas de film gras.',
  'Livraison rapide et produit conforme. Je rachèterai.',
];
const REVIEW_TEXTS_4 = ["Très bon produit, j'aurais juste aimé un format plus grand.", 'Efficace, la texture est agréable.'];

async function seedConsumers(prisma: PrismaClient, rand: () => number, count: number) {
  const existing = await prisma.user.count({ where: { email: { startsWith: 'cliente-demo-' } } });
  if (existing >= count) {
    const rows = await prisma.consomateur.findMany({
      where: { user: { email: { startsWith: 'cliente-demo-' } } },
      select: { id_consumer: true, wilaya: true },
    });
    return rows.map((r, i) => ({ id: r.id_consumer, wilaya: r.wilaya ?? 'Alger', skin: SKINS[i % SKINS.length].value }));
  }

  const consumers = Array.from({ length: count }, (_, i) => {
    const prenom = FIRST_NAMES[i % FIRST_NAMES.length];
    return {
      idUsr: randomUUID(),
      id: randomUUID(),
      prenom,
      nom: `${LAST_INITIALS[i % LAST_INITIALS.length]}.`,
      email: `cliente-demo-${i + 1}@withyou.dz`,
      wilaya: pickWeighted(rand, WILAYAS),
      skin: pickWeighted(rand, SKINS),
    };
  });

  await prisma.user.createMany({
    data: consumers.map((c) => ({ id_usr: c.idUsr, role: 'CONSUMER', email: c.email, username: c.email.split('@')[0], created_at: new Date() })),
  });
  await prisma.consomateur.createMany({
    data: consumers.map((c, i) => ({
      id_consumer: c.id,
      id_usr: c.idUsr,
      nom: c.nom,
      prenom: c.prenom,
      wilaya: c.wilaya,
      phone: `05500${String(i).padStart(5, '0')}`,
    })),
  });
  return consumers.map((c) => ({ id: c.id, wilaya: c.wilaya, skin: c.skin }));
}

/**
 * Fills the Azul Cosmétique demo brand with the same products, sales, reviews,
 * promotion and salon tests as the prototype, plus 90 days of order and
 * behaviour history so every partner screen has real data behind it.
 * Skipped when the brand already has products.
 */
export async function seedDemoActivity(prisma: PrismaClient): Promise<void> {
  const marque = await prisma.marque.findUnique({ where: { slug: 'azul-cosmetique-story' } });
  if (!marque) return;
  if ((await prisma.produit.count({ where: { id_marque: marque.id_marque } })) > 0) {
    console.log('Activité de démo déjà présente pour Azul, ignorée.');
    return;
  }

  const rand = mulberry32(20260924);
  const now = Date.now();

  const categories = await prisma.categorie.findMany();
  const catId = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    if (!c) throw new Error(`Catégorie "${slug}" absente — lancez d'abord le seed des catégories.`);
    return c.id_cat;
  };

  // Products
  const products = AZUL_PRODUCTS.map((p) => ({ ...p, id: randomUUID() }));
  for (const p of products) {
    await prisma.produit.create({
      data: {
        id_product: p.id,
        id_marque: marque.id_marque,
        id_categori: catId(p.categorySlug),
        nom: p.nom,
        description: p.description,
        ingredients: p.inci,
        prix: p.prix,
        stock: p.stock,
        status: p.status,
        mode_conservation: ['Température ambiante'],
        size: p.size,
        skin_types: p.skins,
        needs: p.needs,
        moment: p.moment,
        comission_negocie: 15,
        created_at: new Date(now - 100 * DAY),
        updated_at: new Date(now),
        produit_image: p.image
          ? { create: [{ url: p.image, ordre: 0, is_principale: true }] }
          : undefined,
      },
    });
  }
  const online = products.filter((p) => p.status === 'ONLINE');

  // Customers, orders, lines, payments (90 days)
  const consumers = await seedConsumers(prisma, rand, 300);
  const lines: { id_ligne: string; id_order: string; id_product: string; quantite: number; prix_unitaire: number; comission: number }[] = [];
  const payments: { id_paiement: string; id_order: string; methode: string; statut: string; montant: number; created_at: Date; date_paiement: Date }[] = [];
  const orderRows: {
    id_order: string;
    id_consumer: string;
    status: string;
    montant_total: number;
    montant_comission: number;
    mode_paiement: string;
    adresse_livraison: string;
    wilaya_livraison: string;
    commune_livraison: string;
    code_suivi: string;
    created_at: Date;
    updated_at: Date;
  }[] = [];

  let trackingSeq = 1000;
  for (let day = 89; day >= 0; day--) {
    const count = 1 + Math.floor(rand() * 3); // 1-3 orders a day
    for (let n = 0; n < count; n++) {
      const consumer = consumers[Math.floor(rand() * consumers.length)];
      const date = new Date(now - day * DAY - Math.floor(rand() * 10) * 3600_000);
      const orderId = randomUUID();
      const pool = [...online];
      const lineCount = rand() < 0.4 ? 2 : 1;
      let total = 0;
      let commission = 0;
      for (let k = 0; k < lineCount && pool.length; k++) {
        const chosen = pickWeighted(
          rand,
          pool.map((p) => ({ value: p, weight: Math.max(p.sellWeight, 1) })),
        );
        pool.splice(pool.indexOf(chosen), 1);
        const qty = rand() < 0.2 ? 2 : 1;
        const lineTotal = chosen.prix * qty;
        total += lineTotal;
        commission += lineTotal * 0.15;
        lines.push({
          id_ligne: randomUUID(),
          id_order: orderId,
          id_product: chosen.id,
          quantite: qty,
          prix_unitaire: chosen.prix,
          comission: Math.round(lineTotal * 0.15),
        });
      }
      orderRows.push({
        id_order: orderId,
        id_consumer: consumer.id,
        status: 'confirmee',
        montant_total: total,
        montant_comission: Math.round(commission),
        mode_paiement: 'CIB',
        adresse_livraison: 'Adresse de démonstration',
        wilaya_livraison: consumer.wilaya,
        commune_livraison: consumer.wilaya,
        code_suivi: `WY-${trackingSeq++}`,
        created_at: date,
        updated_at: date,
      });
      payments.push({ id_paiement: randomUUID(), id_order: orderId, methode: 'CIB', statut: 'paye', montant: total, created_at: date, date_paiement: date });
    }
  }
  await prisma.order.createMany({ data: orderRows });
  await prisma.ligne_order.createMany({ data: lines });
  await prisma.paiement.createMany({ data: payments });

  // Behaviour events (90 days)
  const events: {
    type: 'PAGE_VIEW' | 'PRODUCT_OPEN' | 'PRODUCT_KEPT' | 'SEARCH';
    id_marque: string;
    id_produit: string | null;
    id_consumer: string | null;
    query: string | null;
    skin_type: string | null;
    wilaya: string | null;
    created_at: Date;
  }[] = [];
  const at = (day: number) => new Date(now - day * DAY - Math.floor(rand() * 20) * 3600_000);
  for (let day = 89; day >= 0; day--) {
    const growth = 0.8 + (1 - day / 90) * 0.4;
    for (let i = 0; i < Math.round(55 * growth); i++) {
      events.push({ type: 'PAGE_VIEW', id_marque: marque.id_marque, id_produit: null, id_consumer: null, query: null, skin_type: null, wilaya: null, created_at: at(day) });
    }
    for (let i = 0; i < Math.round(24 * growth); i++) {
      const c = consumers[Math.floor(rand() * consumers.length)];
      const p = pickWeighted(rand, online.map((x) => ({ value: x, weight: x.openWeight })));
      events.push({ type: 'PRODUCT_OPEN', id_marque: marque.id_marque, id_produit: p.id, id_consumer: c.id, query: null, skin_type: c.skin, wilaya: c.wilaya, created_at: at(day) });
    }
    for (let i = 0; i < Math.round(5 * growth); i++) {
      const c = consumers[Math.floor(rand() * consumers.length)];
      const p = pickWeighted(rand, online.map((x) => ({ value: x, weight: x.keepWeight })));
      events.push({ type: 'PRODUCT_KEPT', id_marque: marque.id_marque, id_produit: p.id, id_consumer: c.id, query: null, skin_type: c.skin, wilaya: c.wilaya, created_at: at(day) });
    }
    for (let i = 0; i < Math.round(4 * growth); i++) {
      events.push({ type: 'SEARCH', id_marque: marque.id_marque, id_produit: null, id_consumer: null, query: pickWeighted(rand, SEARCHES), skin_type: null, wilaya: null, created_at: at(day) });
    }
  }
  for (let i = 0; i < events.length; i += 5000) {
    await prisma.analytics_event.createMany({ data: events.slice(i, i + 5000) });
  }

  // Reviews: the four from the prototype (three still unanswered) + a replied history
  const byKey = new Map(products.map((p) => [p.key, p.id]));
  const reviewRows: {
    id_produit: string;
    id_marque: string;
    id_consumer: string | null;
    auteur: string;
    stars: number;
    texte: string;
    skin_type: string | null;
    reply: string | null;
    replied_at: Date | null;
    created_at: Date;
  }[] = [];
  const addReview = (key: string, auteur: string, stars: number, texte: string, skin: string | null, daysAgo: number, reply: string | null) =>
    reviewRows.push({
      id_produit: byKey.get(key)!,
      id_marque: marque.id_marque,
      id_consumer: null,
      auteur,
      stars,
      texte,
      skin_type: skin,
      reply,
      replied_at: reply ? new Date(now - (daysAgo - 1) * DAY) : null,
      created_at: new Date(now - daysAgo * DAY),
    });

  addReview('azar', 'Asma Khe', 5, "J'ai adoré cette marque ! Les produits ont vraiment amélioré l'aspect de ma peau, je recommande vivement.", 'Peau mixte', 3, null);
  addReview('serum', 'Lina B.', 5, "Des soins d'une qualité exceptionnelle, on sent vraiment les rituels algériens dans chaque produit.", 'Peau sèche', 6, 'Merci Lina, ça nous touche beaucoup. À très vite pour la suite du rituel ! Saloi');
  addReview('azar', 'Meriem S.', 3, "Efficace pour démaquiller, mais l'odeur est un peu forte pour ma peau sensible. J'aurais aimé une version sans parfum.", 'Peau sensible', 8, null);
  addReview('savon', 'Kenza R.', 4, 'Parfait au hammam, la peau est nette. Livraison rapide à Oran.', 'Peau grasse', 12, null);

  const keys = ['azar', 'thala', 'serum', 'karite', 'savon'];
  const generated: [number, number][] = [
    [5, 25],
    [4, 6],
    [3, 2],
    [2, 1],
  ];
  let seq = 0;
  for (const [stars, count] of generated) {
    for (let i = 0; i < count; i++) {
      const texte = stars >= 5 ? REVIEW_TEXTS_5[i % REVIEW_TEXTS_5.length] : stars === 4 ? REVIEW_TEXTS_4[i % REVIEW_TEXTS_4.length] : 'Correct, mais je m’attendais à mieux.';
      addReview(
        keys[seq % keys.length],
        `${FIRST_NAMES[(seq + 3) % FIRST_NAMES.length]} ${LAST_INITIALS[seq % LAST_INITIALS.length]}.`,
        stars,
        texte,
        `Peau ${SKINS[seq % SKINS.length].value.toLowerCase()}`,
        15 + seq * 2,
        'Merci pour votre retour, il nous aide beaucoup à avancer.',
      );
      seq++;
    }
  }
  await prisma.avis.createMany({ data: reviewRows });

  // Promotion (running now, as in the prototype)
  await prisma.promotion.create({
    data: {
      id_marque: marque.id_marque,
      nom: 'Rituel du matin',
      reduction: 15,
      date_debut: new Date(now - 8 * DAY),
      date_fin: new Date(now + 7 * DAY),
      utilisations: 23,
      produits: { create: [{ id_produit: byKey.get('azar')! }, { id_produit: byKey.get('thala')! }] },
    },
  });

  // Salons + tests
  const salons = await Promise.all(
    [
      { nom: 'Salon Lumière', wilaya: 'Alger', ville: 'Hydra', code: 'LUMIERE10', formee: true },
      { nom: 'Institut Tafsut', wilaya: 'Tizi Ouzou', ville: 'Tizi Ouzou', code: 'TAFSUT10', formee: true },
      { nom: 'Institut Nour', wilaya: 'Oran', ville: 'Oran', code: 'NOUR10', formee: true },
    ].map((s) => prisma.salon.upsert({ where: { code: s.code }, update: {}, create: s })),
  );
  const salon = (code: string) => salons.find((s) => s.code === code)!.id_salon;
  await prisma.salon_test.createMany({
    data: [
      {
        id_marque: marque.id_marque,
        id_produit: byKey.get('thala')!,
        id_salon: salon('LUMIERE10'),
        echantillons: 15,
        status: 'DONE',
        testeuses: 12,
        score: 4.6,
        citation: 'Texture appréciée, pénètre vite. Plusieurs clientes demandent un format voyage.',
        created_at: new Date(now - 40 * DAY),
      },
      {
        id_marque: marque.id_marque,
        id_produit: byKey.get('savon')!,
        id_salon: salon('TAFSUT10'),
        echantillons: 20,
        status: 'DONE',
        testeuses: 20,
        score: 4.8,
        citation: "Adopté au hammam de l'institut. Les clientes le rachètent sur place.",
        created_at: new Date(now - 30 * DAY),
      },
      {
        id_marque: marque.id_marque,
        id_produit: byKey.get('serum')!,
        id_salon: salon('NOUR10'),
        echantillons: 10,
        status: 'RUNNING',
        testeuses: 8,
        created_at: new Date(now - 6 * DAY),
      },
    ],
  });

  console.log(`Activité de démo créée pour Azul : ${products.length} produits, ${orderRows.length} commandes, ${events.length} événements, ${reviewRows.length} avis.`);
}
