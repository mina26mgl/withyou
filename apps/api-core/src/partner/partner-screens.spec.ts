import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics/analytics.service';
import { BrandPageService } from './brand-page/brand-page.service';
import { PartnerStatsService } from './common/partner-stats.service';
import { PRIVACY_MIN_GROUP } from './common/privacy';
import { HomeService } from './home/home.service';
import { PlacementsService } from './placements/placements.service';
import { PromotionsService, promotionStatus } from './promotions/promotions.service';
import { ReviewsService } from './reviews/reviews.service';
import { SalonTestsService } from './salon-tests/salon-tests.service';
import { SummaryService } from './summary/summary.service';

/**
 * Integration tests against the local dev Postgres. Read-only assertions use
 * the seeded "Azul Cosmétique" demo brand (run `pnpm --filter @withyou/api-core db:seed`
 * first); anything that writes uses throwaway brands cleaned up in afterAll.
 */
describe('partner screens', () => {
  let prisma: PrismaService;
  let azulId: string;
  let azulPartnerId: string;
  let categorieId: string;

  const tmpA = randomUUID();
  const tmpB = randomUUID();
  let tmpAProduct: string;
  let tmpBProduct: string;
  let tmpBDraftProduct: string;
  let tmpBReview: string;

  const brand = () => new BrandPageService(prisma);
  const stats = () => new PartnerStatsService(prisma, brand());

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();

    const azul = await prisma.marque.findUniqueOrThrow({ where: { slug: 'azul-cosmetique-story' } });
    azulId = azul.id_marque;
    azulPartnerId = (await prisma.partenaire_contact.findFirstOrThrow({ where: { id_marque: azulId } })).id_partenaire;
    categorieId = (await prisma.categorie.findFirstOrThrow()).id_cat;

    await prisma.marque.createMany({
      data: [tmpA, tmpB].map((id, i) => ({
        id_marque: id,
        nom_marque: `Marque écran ${i}`,
        slug: `marque-ecran-${id}`,
        date_creation: new Date('2024-01-01'),
        adresse: 'Adresse test',
        engagement: [],
        besoin: [],
        wilaya_marque: 'Alger',
        histoire_marque: 'Histoire test',
        page_status: i === 0 ? 'DRAFT' : 'LIVE',
      })),
    });

    const mkProduct = async (marqueId: string, status: 'ONLINE' | 'DRAFT') => {
      const id = randomUUID();
      await prisma.produit.create({
        data: {
          id_product: id,
          id_marque: marqueId,
          id_categori: categorieId,
          nom: 'Produit test',
          description: 'd',
          ingredients: [],
          prix: 1000,
          stock: 5,
          status,
          mode_conservation: ['Température ambiante'],
          comission_negocie: 15,
        },
      });
      return id;
    };
    tmpAProduct = await mkProduct(tmpA, 'ONLINE');
    tmpBProduct = await mkProduct(tmpB, 'ONLINE');
    tmpBDraftProduct = await mkProduct(tmpB, 'DRAFT');

    tmpBReview = (
      await prisma.avis.create({
        data: { id_produit: tmpBProduct, id_marque: tmpB, auteur: 'Test T.', stars: 4, texte: 'Bien' },
      })
    ).id_avis;
  });

  afterAll(async () => {
    const ids = [tmpA, tmpB];
    await prisma.analytics_event.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.avis.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.promotion.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.salon_test.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.placement_request.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.produit.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.marque.deleteMany({ where: { id_marque: { in: ids } } });
    await prisma.onModuleDestroy();
  });

  describe('home', () => {
    it("surfaces what needs the brand's attention, with an action for each", async () => {
      const summary = new SummaryService(prisma, brand());
      const home = await new HomeService(prisma, stats(), summary).get(azulId, azulPartnerId);

      const kinds = home.todos.map((t) => t.kind);
      expect(kinds).toContain('OUT_OF_STOCK');
      expect(kinds).toContain('UNANSWERED_REVIEWS');
      expect(home.todos.every((t) => t.href.startsWith('/') && t.cta.length > 0)).toBe(true);
      expect(home.kpis.reviewCount).toBeGreaterThan(0);
      expect(home.revenueSeries).toHaveLength(30);
    });

    it('ranks the top products by units sold over 30 days', async () => {
      const summary = new SummaryService(prisma, brand());
      const home = await new HomeService(prisma, stats(), summary).get(azulId, azulPartnerId);
      const sold = home.topProducts.map((p) => p.ventes30j);
      expect(home.topProducts.length).toBeLessThanOrEqual(4);
      expect([...sold].sort((a, b) => b - a)).toEqual(sold);
    });
  });

  describe('analytics', () => {
    it('rejects periods other than 7, 30 or 90 days', () => {
      const service = new AnalyticsService(prisma, stats());
      expect(() => service.parsePeriod('45')).toThrow(BadRequestException);
      expect(service.parsePeriod('90')).toBe(90);
    });

    it('builds a funnel that never grows from one step to the next', async () => {
      const a = await new AnalyticsService(prisma, stats()).get(azulId, 30);
      expect(a.funnel.visits).toBeGreaterThanOrEqual(a.funnel.opened);
      expect(a.funnel.opened).toBeGreaterThanOrEqual(a.funnel.kept);
      expect(a.funnel.kept).toBeGreaterThanOrEqual(a.funnel.purchases);
      expect(a.series).toHaveLength(30);
    });

    it('never shares a group of fewer than 20 customers', async () => {
      const a = await new AnalyticsService(prisma, stats()).get(azulId, 90);
      for (const rows of [a.skinTypes, a.wilayas]) {
        expect(rows.insufficient).toBe(false);
      }
      // A brand with no history gets "not enough data", not an empty chart.
      const empty = await new AnalyticsService(prisma, stats()).get(tmpA, 30);
      expect(empty.skinTypes).toEqual({ insufficient: true, minimum: PRIVACY_MIN_GROUP });
      expect(empty.wilayas).toEqual({ insufficient: true, minimum: PRIVACY_MIN_GROUP });
    });

    it('explains a weak product whose ingredient list is empty', async () => {
      const a = await new AnalyticsService(prisma, stats()).get(azulId, 90);
      const weak = a.insights.find((i) => i.cta === 'Compléter la fiche');
      expect(weak?.productId).toBeDefined();
      expect(weak?.text).toContain("liste d'ingrédients est vide");
    });
  });

  describe('reviews', () => {
    it('summarises ratings and counts unanswered reviews', async () => {
      const r = await new ReviewsService(prisma).list(azulId, 'all');
      expect(r.summary.count).toBeGreaterThan(0);
      expect(r.summary.distribution.map((d) => d.stars)).toEqual([5, 4, 3, 2, 1]);
      const open = await new ReviewsService(prisma).list(azulId, 'open');
      expect(open.reviews.every((x) => x.reply === null)).toBe(true);
      const low = await new ReviewsService(prisma).list(azulId, 'low');
      expect(low.reviews.every((x) => x.stars <= 3)).toBe(true);
    });

    it("does not let a brand answer another brand's review", async () => {
      await expect(new ReviewsService(prisma).reply(tmpA, tmpBReview, 'Merci !')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires a non-empty reply and allows only one', async () => {
      const service = new ReviewsService(prisma);
      await expect(service.reply(tmpB, tmpBReview, '   ')).rejects.toBeInstanceOf(BadRequestException);
      const done = await service.reply(tmpB, tmpBReview, 'Merci pour votre retour.');
      expect(done.reply).toBe('Merci pour votre retour.');
      await expect(service.reply(tmpB, tmpBReview, 'Encore')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('promotions', () => {
    const base = { nom: 'Rituel', reduction: 15, dateDebut: '2026-10-01', dateFin: '2026-10-15' };

    it.each([
      [{ nom: '  ' }, 'Donnez un nom à la promotion.'],
      [{ produitIds: [] as string[] }, 'Choisissez au moins un produit.'],
      [{ reduction: 4 }, 'La réduction doit être entre 5 et 50 %.'],
      [{ reduction: 51 }, 'La réduction doit être entre 5 et 50 %.'],
      [{ dateFin: '2026-09-01' }, 'La date de fin doit suivre la date de début.'],
    ])('rejects %j', async (override, message) => {
      const service = new PromotionsService(prisma);
      await expect(service.create(tmpB, { ...base, produitIds: [tmpBProduct], ...override })).rejects.toThrow(message);
    });

    it("refuses another brand's product and non-online products", async () => {
      const service = new PromotionsService(prisma);
      await expect(service.create(tmpB, { ...base, produitIds: [tmpAProduct] })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(tmpB, { ...base, produitIds: [tmpBDraftProduct] })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a promotion and derives its status from the dates', async () => {
      const created = await new PromotionsService(prisma).create(tmpB, { ...base, produitIds: [tmpBProduct] });
      expect(created.produitsNoms).toEqual(['Produit test']);
      expect(promotionStatus(new Date('2026-10-01'), new Date('2026-10-15'), new Date('2026-09-23'))).toBe('SCHEDULED');
      expect(promotionStatus(new Date('2026-10-01'), new Date('2026-10-15'), new Date('2026-10-05'))).toBe('ACTIVE');
      expect(promotionStatus(new Date('2026-10-01'), new Date('2026-10-15'), new Date('2026-10-16'))).toBe('ENDED');
    });
  });

  describe('salon tests', () => {
    it('validates the request', async () => {
      const service = new SalonTestsService(prisma);
      await expect(service.create(tmpB, { produitId: tmpBProduct, echantillons: 4 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(tmpB, { produitId: tmpBProduct, echantillons: 51 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(tmpB, { produitId: tmpBDraftProduct, echantillons: 15 })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.create(tmpB, { produitId: tmpAProduct, echantillons: 15 })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a pending request and aggregates the brand summary', async () => {
      const service = new SalonTestsService(prisma);
      const created = await service.create(tmpB, { produitId: tmpBProduct, echantillons: 15, wilaya: 'Peu importe' });
      expect(created.status).toBe('PENDING');
      expect(created.salonNom).toBeNull();

      const azul = await service.list(azulId);
      expect(azul.summary.tests).toBeGreaterThanOrEqual(3);
      expect(azul.summary.satisfaction).not.toBeNull();
    });
  });

  describe('placements', () => {
    it("refuses a placement for another brand's product", async () => {
      await expect(new PlacementsService(prisma).request(tmpA, { kind: 'BOX', produitId: tmpBProduct })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      const ok = await new PlacementsService(prisma).request(tmpA, { kind: 'ROUTINE' });
      expect(ok.status).toBe('REQUESTED');
    });
  });

  describe('public events', () => {
    it('ignores events for a brand whose page is not live', async () => {
      const service = new EventsService(prisma);
      await service.record({ type: 'PAGE_VIEW', slug: `marque-ecran-${tmpA}` });
      expect(await prisma.analytics_event.count({ where: { id_marque: tmpA } })).toBe(0);
    });

    it('records events for a live brand, and resolves the brand from the product', async () => {
      const service = new EventsService(prisma);
      await service.record({ type: 'PAGE_VIEW', slug: `marque-ecran-${tmpB}` });
      await service.record({ type: 'SEARCH', produitId: tmpBProduct, query: '  Savon Noir ' });
      const events = await prisma.analytics_event.findMany({ where: { id_marque: tmpB } });
      expect(events.map((e) => e.type).sort()).toEqual(['PAGE_VIEW', 'SEARCH']);
      expect(events.find((e) => e.type === 'SEARCH')?.query).toBe('savon noir');
    });

    it('does nothing for an unknown brand or product', async () => {
      const service = new EventsService(prisma);
      const before = await prisma.analytics_event.count();
      await service.record({ type: 'PAGE_VIEW', slug: 'does-not-exist' });
      await service.record({ type: 'PRODUCT_OPEN', produitId: randomUUID() });
      expect(await prisma.analytics_event.count()).toBe(before);
    });
  });
});
