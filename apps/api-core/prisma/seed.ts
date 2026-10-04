import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { slugify } from '@withyou/shared-utils';
import { seedDemoActivity } from './seed-demo-activity';

const prisma = new PrismaClient();

const CATEGORIES = [
  'Nettoyant',
  'Sérum',
  'Crème et hydratant',
  'Huile',
  'Savon',
  'Masque',
  'Soin cheveux',
  'Soin corps',
  'Maquillage',
];

async function seedCategories() {
  for (const nom of CATEGORIES) {
    const slug = slugify(nom);
    await prisma.categorie.upsert({
      where: { slug },
      update: { nom },
      create: { id_cat: randomUUID(), nom, slug },
    });
  }
  console.log(`Catégories: ${CATEGORIES.length} synchronisées.`);
}

interface DemoBrandSpec {
  email: string;
  nomMarque: string;
  slug: string;
  dateCreation: string;
  adresse: string;
  wilaya: string;
  histoire: string;
  origin: string;
  couleurPrincipale: string;
  couleurText: string;
  couleurTitre: string;
  bannerUrl: string;
  logoUrl: string;
  engagement: string[];
  founders: Array<{ prenom: string; nom: string; role: string; photo: string }>;
}

/**
 * Dev-only demo partner accounts, so `(partner)/page-marque`, `(partner)/produits`
 * and the public `/marque/[slug]` pages have something to show locally. Content
 * matches the brands from the old MOCK_MARQUES front-end mock, now stored for
 * real. Not meant for production data.
 */
async function seedDemoBrand(spec: DemoBrandSpec) {
  const existingUser = await prisma.user.findFirst({ where: { email: spec.email } });
  if (existingUser) {
    console.log(`Marque de démo "${spec.nomMarque}" déjà présente, seed ignoré.`);
    return;
  }

  const idUsr = randomUUID();
  const idMarque = randomUUID();
  const idPartenaire = randomUUID();
  const idIdentity = randomUUID();

  await prisma.user.create({
    data: { id_usr: idUsr, role: 'PARTNER', email: spec.email, username: slugify(spec.nomMarque), created_at: new Date() },
  });

  await prisma.marque.create({
    data: {
      id_marque: idMarque,
      nom_marque: spec.nomMarque,
      slug: spec.slug,
      date_creation: new Date(spec.dateCreation),
      adresse: spec.adresse,
      engagement: spec.engagement,
      besoin: [],
      wilaya_marque: spec.wilaya,
      histoire_marque: spec.histoire,
      origin: spec.origin,
      // Live by default so the public /marque/:slug page has something to
      // show locally without an extra manual step.
      page_status: 'LIVE',
    },
  });

  await prisma.identity_marque.create({
    data: {
      id_identity: idIdentity,
      id_marque: idMarque,
      couleur_principale: spec.couleurPrincipale,
      couleur_text: spec.couleurText,
      couleur_titre: spec.couleurTitre,
      title_font: 'serif',
      banner_url: spec.bannerUrl,
      logo_url: spec.logoUrl,
    },
  });

  for (const f of spec.founders) {
    const idVisage = randomUUID();
    await prisma.visage.create({
      data: { id_visage: idVisage, nom: f.nom, prenom: f.prenom, photo_url: f.photo },
    });
    await prisma.marque_visage.create({
      data: { id_marque: idMarque, id_visage: idVisage, role: f.role },
    });
  }

  await prisma.partenaire_contact.create({
    data: {
      id_partenaire: idPartenaire,
      id_usr: idUsr,
      id_marque: idMarque,
      role_partenaire: 'OWNER',
      titre_poste: spec.founders[0]?.role ?? 'Fondatrice',
    },
  });

  console.log(`Marque de démo créée: ${spec.nomMarque} (${idMarque}).`);
}

const DEMO_BRANDS: DemoBrandSpec[] = [
  {
    email: 'demo-partner@withyou.dz',
    nomMarque: 'Azul Cosmétique',
    slug: 'azul-cosmetique-story',
    dateCreation: '2022-01-01',
    adresse: 'Zone artisanale, Tizi Ouzou',
    wilaya: 'Tizi Ouzou',
    histoire:
      "Nous partons à la recherche des rituels de beauté perdus d'Algérie. Notre but : faire perdurer ces savoirs transmis de mère en fille, et les glisser dans des soins d'aujourd'hui, formulés avec les huiles et les plantes de Kabylie.",
    origin: 'Fondée en 2022 par Saloi Djedid à Tizi Ouzou, dans un petit atelier familial.',
    couleurPrincipale: '#F6EEE9',
    couleurText: '#3B2B28',
    couleurTitre: '#8E4B5A',
    bannerUrl: '/couverture_azul.mp4',
    logoUrl: '/azul-logo.svg',
    engagement: ['Origine naturelle', 'Rituels ancestraux', 'Fait en Algérie', 'Vegan'],
    founders: [
      { prenom: 'Saloi', nom: 'Djedid', role: 'Co-fondatrice', photo: '/visage1.png' },
      { prenom: 'Kevin', nom: 'Manson Benabdemeziem', role: 'Co-fondateur', photo: '/visage2.png' },
    ],
  },
  {
    email: 'demo-dihya@withyou.dz',
    nomMarque: 'Dihya',
    slug: 'dihya-story',
    dateCreation: '2016-01-01',
    adresse: 'Alger Centre',
    wilaya: 'Alger',
    histoire:
      "Dihya Cosmetics, fondée en 2016, s'est engagée depuis sa création à résoudre les problèmes de peau spécifiques aux femmes algériennes. Notre parcours de 8 ans a été guidé par la recherche constante de solutions issues de la nature.",
    origin: 'Fondée en 2016 à Alger par une équipe engagée pour la peau des femmes algériennes.',
    couleurPrincipale: '#232323',
    couleurText: '#FFFFFF',
    couleurTitre: '#D9B26F',
    bannerUrl: '/couverture_dihya.png',
    logoUrl: '/Logo_dihya.jpg',
    engagement: ['Testés & Approuvés', 'Formules Naturelles & Actives', 'Engagés pour Votre Bien-Être', 'Marque 100% Algérienne'],
    founders: [
      { prenom: 'Hayet', nom: 'Aoula', role: 'Partenaire', photo: '/visage1_dihya.png' },
      { prenom: 'Manel', nom: '', role: 'Partenaire', photo: '/visage2_dihya.png' },
    ],
  },
  {
    email: 'demo-namira@withyou.dz',
    nomMarque: 'Aryana',
    slug: 'namira-story',
    dateCreation: '2019-01-01',
    adresse: 'Oran Centre',
    wilaya: 'Oran',
    histoire:
      "Découvre le secret des rituels de beauté avec Namira. Nous partons à la recherche des rituels de beauté perdus d'Algérie. Le but, faire perdurer ces savoirs et sauvegarder les connaissances du monde oriental.",
    origin: 'Fondée par Rania Bensalem à Oran, inspirée par les rituels de beauté orientaux.',
    couleurPrincipale: '#F6D9E3',
    couleurText: '#031A06',
    couleurTitre: '#C9748A',
    bannerUrl: '/couverture_namira.png',
    logoUrl: '/aryana_logo.png',
    engagement: ['Testés & Approuvés', 'Formules Naturelles & Actives', 'Engagés pour Votre Bien-Être', 'Marque 100% Algérienne'],
    founders: [
      { prenom: 'Dr.', nom: 'Rahima', role: 'Partenaire', photo: '/visage1_aryana.png' },
      { prenom: 'Abla', nom: 'Lebousati', role: 'Partenaire', photo: '/visage2_aryana.png' },
    ],
  },
];

async function main() {
  await seedCategories();
  for (const brand of DEMO_BRANDS) {
    await seedDemoBrand(brand);
  }
  await seedDemoActivity(prisma);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
