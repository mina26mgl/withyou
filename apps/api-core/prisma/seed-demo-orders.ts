/**
 * Commandes d'exemple pour montrer l'écran « Commandes » de la console admin.
 * Tout est repérable : commandes DEMO-0001…, clientes demo-cliente-N@demo.withyou.dz.
 *
 *   pnpm --filter @withyou/api-core db:demo-orders           # crée (remplace les précédentes)
 *   pnpm --filter @withyou/api-core db:demo-orders --delete  # supprime tout le fictif DEMO
 */
import { randomUUID } from 'crypto';
import { PrismaClient, incident_type } from '@prisma/client';

const prisma = new PrismaClient();
const CODE_PREFIX = 'DEMO-';
const EMAIL_DOMAIN = '@demo.withyou.dz';

const CLIENTES = [
  { prenom: 'Lina', nom: 'Benali', wilaya: 'Alger', commune: 'Hydra', phone: '0551234541' },
  { prenom: 'Yasmine', nom: 'Mansouri', wilaya: 'Oran', commune: 'Bir El Djir', phone: '0661234522' },
  { prenom: 'Hana', nom: 'Zerrouki', wilaya: 'Ouargla', commune: 'Ouargla', phone: '0771234533' },
  { prenom: 'Sonia', nom: 'Rahmani', wilaya: 'Annaba', commune: 'Annaba', phone: '0551234544' },
  { prenom: 'Asma', nom: 'Khelifi', wilaya: 'Tizi Ouzou', commune: 'Azazga', phone: '0661234555' },
  { prenom: 'Nour', nom: 'Hamidi', wilaya: 'Constantine', commune: 'El Khroub', phone: '0771234566' },
];

type Scenario = {
  client: number;
  qty: number;
  pay: 'CIB' | 'Edahabia' | 'À la livraison';
  paid: boolean;
  received: boolean;
  carrier?: 'Yalidine' | 'ZR Express' | 'Coursiers Alger';
  shipped?: boolean;
  delivered?: boolean;
  block?: { type: incident_type; reason: string };
  hoursAgo: number;
};

/** Une commande par étape, dont plusieurs bloquées, comme dans le prototype. */
const SCENARIOS: Scenario[] = [
  { client: 3, qty: 1, pay: 'CIB', paid: false, received: false, hoursAgo: 6, block: { type: 'PAYMENT', reason: 'Paiement CIB non confirmé par la SATIM' } },
  { client: 4, qty: 2, pay: 'Edahabia', paid: false, received: false, hoursAgo: 3 },
  { client: 0, qty: 1, pay: 'CIB', paid: true, received: false, hoursAgo: 5 },
  { client: 5, qty: 1, pay: 'CIB', paid: true, received: false, hoursAgo: 50, block: { type: 'BRAND', reason: "La marque n'a pas encore remis le produit, J+2" } },
  { client: 4, qty: 1, pay: 'À la livraison', paid: false, received: true, hoursAgo: 26 },
  { client: 5, qty: 1, pay: 'Edahabia', paid: true, received: true, hoursAgo: 30, block: { type: 'QUALITY', reason: 'Pot abîmé au contrôle, remplacement demandé à la marque' } },
  { client: 0, qty: 3, pay: 'CIB', paid: true, received: true, carrier: 'Yalidine', shipped: true, hoursAgo: 48 },
  { client: 1, qty: 1, pay: 'À la livraison', paid: false, received: true, carrier: 'Yalidine', shipped: true, hoursAgo: 72, block: { type: 'CLIENT', reason: 'Cliente injoignable, 2 tentatives' } },
  { client: 2, qty: 2, pay: 'À la livraison', paid: false, received: true, carrier: 'ZR Express', shipped: true, hoursAgo: 96, block: { type: 'CARRIER', reason: 'Colis immobile depuis 3 jours au hub de Ghardaïa' } },
  { client: 1, qty: 1, pay: 'À la livraison', paid: true, received: true, carrier: 'Yalidine', shipped: true, delivered: true, hoursAgo: 120 },
];

async function deleteDemo() {
  const orders = await prisma.order.findMany({ where: { code_suivi: { startsWith: CODE_PREFIX } }, select: { id_order: true } });
  const ids = orders.map((o) => o.id_order);
  await prisma.$transaction([
    prisma.ligne_order.deleteMany({ where: { id_order: { in: ids } } }),
    prisma.paiement.deleteMany({ where: { id_order: { in: ids } } }),
    prisma.livraison.deleteMany({ where: { id_order: { in: ids } } }),
    // order_incident et brand_pickup partent en cascade avec la commande.
    prisma.order.deleteMany({ where: { id_order: { in: ids } } }),
    prisma.consomateur.deleteMany({ where: { user: { email: { endsWith: EMAIL_DOMAIN } } } }),
    prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } }),
  ]);
  console.log(`Supprimé : ${ids.length} commandes DEMO et leurs clientes d'exemple.`);
}

async function create() {
  const produit = await prisma.produit.findFirst({ orderBy: { nom: 'asc' } });
  if (!produit) throw new Error("Il faut au moins un produit en base pour créer des commandes d'exemple.");

  await deleteDemo();

  const consumers: string[] = [];
  for (const [i, c] of CLIENTES.entries()) {
    const idUsr = randomUUID();
    const idConsumer = randomUUID();
    await prisma.user.create({
      data: { id_usr: idUsr, role: 'CONSUMER', email: `demo-cliente-${i + 1}${EMAIL_DOMAIN}`, created_at: new Date() },
    });
    await prisma.consomateur.create({
      data: { id_consumer: idConsumer, id_usr: idUsr, prenom: c.prenom, nom: c.nom, wilaya: c.wilaya, commune: c.commune, phone: c.phone },
    });
    consumers.push(idConsumer);
  }

  const prix = Number(produit.prix);
  const rate = Number(produit.comission_negocie) / 100;
  const at = (h: number) => new Date(Date.now() - h * 3_600_000);

  for (const [n, s] of SCENARIOS.entries()) {
    const c = CLIENTES[s.client];
    const id = randomUUID();
    const total = prix * s.qty;
    const created = at(s.hoursAgo);
    const code = `${CODE_PREFIX}${String(n + 1).padStart(4, '0')}`;

    await prisma.order.create({
      data: {
        id_order: id,
        id_consumer: consumers[s.client],
        status: s.delivered ? 'livree' : 'en_cours',
        montant_total: total,
        montant_comission: Math.round(total * rate),
        mode_paiement: s.pay,
        adresse_livraison: `${12 + n} rue des Oliviers`,
        wilaya_livraison: c.wilaya,
        commune_livraison: c.commune,
        code_suivi: code,
        created_at: created,
        updated_at: created,
        ligne_order: {
          create: { id_ligne: randomUUID(), id_product: produit.id_product, quantite: s.qty, prix_unitaire: prix, comission: Math.round(prix * rate) },
        },
        paiement: {
          create: {
            id_paiement: randomUUID(),
            methode: s.pay,
            statut: s.paid ? 'confirme' : 'en_attente',
            montant: total,
            created_at: created,
            date_paiement: s.paid ? at(s.hoursAgo - 0.5) : null,
          },
        },
        brand_pickup: {
          create: { id_marque: produit.id_marque, received: s.received, received_at: s.received ? at(s.hoursAgo - 20) : null },
        },
        ...(s.carrier
          ? {
              livraison: {
                create: {
                  id_ship: randomUUID(),
                  prestatire: s.carrier,
                  code_suivi: `${s.carrier.slice(0, 3).toUpperCase()}-${code}`,
                  statut: s.delivered ? 'livree' : 'en_transit',
                  date_expidition: s.shipped ? at(s.hoursAgo - 24) : null,
                  date_livraison: s.delivered ? at(s.hoursAgo - 70) : null,
                  type_livraison: 'domicile',
                  frais_livraison: s.carrier === 'Coursiers Alger' ? 400 : 650,
                  created_at: created,
                },
              },
            }
          : {}),
        ...(s.block
          ? {
              order_incident: {
                create: {
                  type: s.block.type,
                  reason: s.block.reason,
                  id_marque: s.block.type === 'BRAND' ? produit.id_marque : null,
                  opened_at: at(Math.max(1, s.hoursAgo - 24)),
                },
              },
            }
          : {}),
      },
    });
  }
  console.log(`Créé : ${SCENARIOS.length} commandes DEMO-0001 à DEMO-${String(SCENARIOS.length).padStart(4, '0')} avec « ${produit.nom} ».`);
}

(process.argv.includes('--delete') ? deleteDemo() : create())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
