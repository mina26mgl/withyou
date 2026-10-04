import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminBrandLegal,
  AdminBrandProduct,
  AdminBrandRow,
  AdminOverview,
  AdminPageReview,
  AdminTeamMember,
  AdminProductReview,
  AdminValidationItem,
  BrandPageContent,
  BrandDocumentType,
} from '@withyou/shared-types';
import { checkBrandContrast } from '@withyou/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { marqueWithBrandContent, toPublishedBrandContent } from '../marques/brand-content.mapper';
import { loadBrandCandidates } from '../marques/brand-extras';
import { publishBrandPage, uniqueBrandSlug } from './publish-brand-page';
import type { BrandLegalDto, UpdateBrandDto } from './admin.dto';
import { AdminBoxService } from './admin-box.service';
import { WITHYOU_CHECK_KEYS } from '../brand-request/brand-checklist';

/** Logo que la marque a mis dans son espace : celui du brouillon, sinon celui publié. */
function brandLogo(m: { draft: Prisma.JsonValue; identity_marque?: { logo_url: string | null } | null }): string | null {
  return (m.draft as { logoUrl?: string | null } | null)?.logoUrl ?? m.identity_marque?.logo_url ?? null;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly box: AdminBoxService,
  ) {}

  private audit(tx: Prisma.TransactionClient, adminId: string, action: string, targetType: string, targetId: string, after?: unknown) {
    return tx.audit_log.create({
      data: {
        actor_admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        after: after === undefined ? undefined : (after as Prisma.InputJsonValue),
      },
    });
  }

  /** L'équipe withyou (accès actifs), pour choisir le chargé de compte d'une marque. */
  async team(): Promise<AdminTeamMember[]> {
    const admins = await this.prisma.admin.findMany({
      where: { actif: true },
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }],
      include: { _count: { select: { marques_suivies: true } } },
    });
    return admins.map((a) => ({ id: a.id_admin, prenom: a.prenom, nom: a.nom, roleAdmin: a.role_admin, brands: a._count.marques_suivies }));
  }

  async overview(): Promise<AdminOverview> {
    const incidents = await this.prisma.order_incident.findMany({
      where: { resolved_at: null },
      orderBy: { opened_at: 'asc' },
      take: 20,
      include: {
        order: {
          select: {
            code_suivi: true,
            wilaya_livraison: true,
            consomateur: { select: { prenom: true, nom: true } },
            livraison: { select: { prestatire: true }, take: 1 },
          },
        },
      },
    });
    const pendingSubscriptions = await this.prisma.abonnement_marque.count({ where: { statut: 'DEMANDE' } });
    const box = await this.box.shortages();
    const [pendingPages, pendingBrandRequests, activeBrands, suspendedBrands, openIncidents, onlineProducts] = await Promise.all([
      this.prisma.marque.count({ where: { page_status: 'IN_REVIEW' } }),
      // Seuls les dossiers complets envoyés par la marque attendent une décision.
      this.prisma.demande_partenaire.count({ where: { status: 'PENDING', submitted_at: { not: null } } }),
      this.prisma.marque.count({ where: { compte_status: 'ACTIVE' } }),
      this.prisma.marque.count({ where: { compte_status: 'SUSPENDED' } }),
      this.prisma.order_incident.count({ where: { resolved_at: null } }),
      this.prisma.produit.count({ where: { status: 'ONLINE' } }),
    ]);
    return {
      incidents: incidents.map((i) => {
        const c = i.order.consomateur;
        return {
          id: i.id_incident,
          orderId: i.id_order,
          orderCode: i.order.code_suivi,
          client: c ? [c.prenom, c.nom ? `${c.nom.charAt(0)}.` : ''].filter(Boolean).join(' ') || null : null,
          wilaya: i.order.wilaya_livraison,
          carrier: i.order.livraison[0]?.prestatire ?? null,
          type: i.type,
          reason: i.reason,
          openedAt: i.opened_at.toISOString(),
        };
      }),
      box,
      pendingSubscriptions,
      pendingPages,
      pendingBrandRequests,
      activeBrands,
      suspendedBrands,
      openIncidents,
      onlineProducts,
    };
  }

  /* ------------------------------ Validations ------------------------------ */

  async validations(): Promise<AdminValidationItem[]> {
    const [pages, demandes, produits] = await Promise.all([
      this.prisma.marque.findMany({
        where: { page_status: 'IN_REVIEW' },
        select: {
          id_marque: true,
          nom_marque: true,
          draft: true,
          identity_marque: { select: { logo_url: true } },
          validation_request: { where: { kind: 'PAGE', status: 'PENDING' }, orderBy: { created_at: 'desc' }, take: 1 },
        },
      }),
      this.prisma.demande_partenaire.findMany({
        where: { status: 'PENDING', submitted_at: { not: null } },
        include: { user: { select: { email: true } }, documents: { orderBy: { created_at: 'asc' } } },
      }),
      this.prisma.produit.findMany({
        where: { status: 'IN_REVIEW' },
        select: {
          id_product: true,
          nom: true,
          size: true,
          marque: { select: { nom_marque: true, draft: true, identity_marque: { select: { logo_url: true } } } },
          validation_request: { where: { kind: 'PRODUCT', status: 'PENDING' }, orderBy: { created_at: 'desc' }, take: 1 },
        },
      }),
    ]);

    const items: AdminValidationItem[] = [
      ...pages.map((m) => {
        const draftName = (m.draft as { name?: string } | null)?.name?.trim();
        return {
          kind: 'page' as const,
          id: m.id_marque,
          brand: draftName || m.nom_marque,
          title: 'Page marque à publier',
          since: m.validation_request[0]?.created_at.toISOString() ?? null,
          logoUrl: brandLogo(m),
        };
      }),
      ...demandes.map((d) => ({
        kind: 'brand' as const,
        id: d.id_demande,
        brand: d.nom_marque,
        title: 'Nouvelle marque : dossier à examiner',
        since: (d.submitted_at ?? d.created_at).toISOString(),
        email: d.user.email,
        documents: d.documents.map((doc) => ({
          id: doc.id_document,
          type: doc.type as BrandDocumentType,
          nom: doc.nom,
          url: doc.url,
          taille: doc.taille,
          createdAt: doc.created_at.toISOString(),
        })),
        checks: d.checks,
        telephone: d.telephone,
        contact: [d.prenom, d.nom].filter(Boolean).join(' ') || null,
        logoUrl: null,
      })),
      ...produits.map((p) => ({
        kind: 'product' as const,
        id: p.id_product,
        brand: (p.marque.draft as { name?: string } | null)?.name?.trim() || p.marque.nom_marque,
        title: p.size ? `${p.nom}, ${p.size}` : p.nom,
        // produit.updated_at est une colonne « heure seule » (Timetz) : sans date, inutilisable ici.
        since: p.validation_request[0]?.created_at.toISOString() ?? null,
        logoUrl: brandLogo(p.marque),
      })),
    ];
    // Les plus anciennes d'abord.
    return items.sort((a, b) => (a.since ?? '').localeCompare(b.since ?? ''));
  }

  private async loadDraft(marqueId: string) {
    const marque = await this.prisma.marque.findUnique({ where: { id_marque: marqueId }, ...marqueWithBrandContent });
    if (!marque) throw new NotFoundException('Marque introuvable.');
    const published = toPublishedBrandContent(marque);
    const draft: BrandPageContent = { ...published, ...((marque.draft as unknown as Partial<BrandPageContent> | null) ?? {}) };
    return { marque, draft };
  }

  private async isFirstPublication(marqueId: string): Promise<boolean> {
    const approved = await this.prisma.validation_request.count({ where: { id_marque: marqueId, kind: 'PAGE', status: 'APPROVED' } });
    return approved === 0;
  }

  async pageReview(marqueId: string): Promise<AdminPageReview> {
    const { marque, draft } = await this.loadDraft(marqueId);
    return {
      marqueId,
      slug: marque.slug,
      draft,
      candidates: await loadBrandCandidates(this.prisma, marqueId),
      contrast: checkBrandContrast(draft.textColor, draft.bgColor, draft.accentColor, draft.cardColor),
      firstPublication: await this.isFirstPublication(marqueId),
    };
  }

  async approvePage(adminId: string, marqueId: string): Promise<{ slug: string }> {
    const { marque, draft } = await this.loadDraft(marqueId);
    if (marque.page_status !== 'IN_REVIEW') {
      throw new BadRequestException("Cette page n'est pas en attente de validation.");
    }
    if (!draft.name.trim()) throw new BadRequestException('La page n’a pas de nom de marque.');
    if (!checkBrandContrast(draft.textColor, draft.bgColor, draft.accentColor, draft.cardColor).ok) {
      throw new BadRequestException('Le contraste des couleurs est insuffisant : demandez des corrections à la marque.');
    }
    const firstPublication = await this.isFirstPublication(marqueId);

    return this.prisma.$transaction(async (tx) => {
      const result = await publishBrandPage(tx, marqueId, draft, { firstPublication });
      await this.resolvePageRequest(tx, marqueId, 'APPROVED', null);
      await this.audit(tx, adminId, 'PAGE_APPROVED', 'marque', marqueId, { slug: result.slug, name: draft.name });
      return result;
    });
  }

  async rejectPage(adminId: string, marqueId: string, message: string): Promise<void> {
    const marque = await this.prisma.marque.findUnique({ where: { id_marque: marqueId } });
    if (!marque) throw new NotFoundException('Marque introuvable.');
    if (marque.page_status !== 'IN_REVIEW') throw new BadRequestException("Cette page n'est pas en attente de validation.");

    await this.prisma.$transaction(async (tx) => {
      // Le brouillon est conservé : la marque corrige puis resoumet.
      await tx.marque.update({ where: { id_marque: marqueId }, data: { page_status: 'DRAFT' } });
      await this.resolvePageRequest(tx, marqueId, 'REJECTED', message.trim());
      await this.audit(tx, adminId, 'PAGE_CHANGES_REQUESTED', 'marque', marqueId, { message });
    });
  }

  /** Clôt la demande PENDING (créée à la soumission) ou en crée une déjà résolue. */
  private async resolvePageRequest(
    tx: Prisma.TransactionClient,
    marqueId: string,
    status: 'APPROVED' | 'REJECTED',
    message: string | null,
  ) {
    const pending = await tx.validation_request.findFirst({
      where: { id_marque: marqueId, kind: 'PAGE', status: 'PENDING' },
      orderBy: { created_at: 'desc' },
    });
    const data = { status, rejection_message: message, resolved_at: new Date() };
    if (pending) await tx.validation_request.update({ where: { id_validation: pending.id_validation }, data });
    else await tx.validation_request.create({ data: { id_marque: marqueId, kind: 'PAGE', ...data } });
  }

  /* -------------------------------- Produits -------------------------------- */

  async productReview(produitId: string): Promise<AdminProductReview> {
    const p = await this.prisma.produit.findUnique({
      where: { id_product: produitId },
      include: {
        marque: true,
        categorie: true,
        produit_image: { orderBy: { ordre: 'asc' } },
        produit_document: { orderBy: { ordre: 'asc' } },
        pack_contenu: {
          orderBy: { ordre: 'asc' },
          include: { composant: { include: { produit_image: { orderBy: { ordre: 'asc' }, take: 1 } } } },
        },
      },
    });
    if (!p) throw new NotFoundException('Produit introuvable.');

    // Contrôle automatique : un ingrédient exclu apparaît-il dans la liste INCI ?
    const excluded = await this.prisma.excluded_ingredient.findMany({ select: { nom: true } });
    const inci = p.ingredients.map((i) => i.toLowerCase());
    const excludedFound = excluded.map((e) => e.nom).filter((nom) => inci.some((i) => i.includes(nom.toLowerCase())));

    return {
      id: p.id_product,
      brand: (p.marque.draft as { name?: string } | null)?.name?.trim() || p.marque.nom_marque,
      nom: p.nom,
      categorie: p.categorie?.nom ?? null,
      size: p.size,
      prix: Number(p.prix),
      stock: p.stock,
      description: p.description,
      images: p.produit_image.map((i) => i.url),
      ingredients: p.ingredients,
      skinTypes: p.skin_types,
      needs: p.needs,
      moment: p.moment,
      modesConservation: p.mode_conservation,
      dureeConservationJours: p.duree_conservation_jours,
      packItems: p.pack_contenu.map((item) => ({
        produitId: item.id_produit,
        nom: item.composant.nom,
        quantite: item.quantite,
        prix: Number(item.composant.prix),
        imageUrl: item.composant.produit_image[0]?.url ?? null,
        statut: item.composant.status,
      })),
      documents: p.produit_document.map((d) => ({
        nom: d.nom,
        url: d.url,
        type: d.type as AdminProductReview['documents'][number]['type'],
        taille: d.taille,
      })),
      checks: {
        inciFilled: p.ingredients.length > 0,
        excludedFound,
        targetingFilled: p.skin_types.length > 0 && p.needs.length > 0,
      },
    };
  }

  async approveProduct(adminId: string, produitId: string): Promise<void> {
    const review = await this.productReview(produitId);
    const p = await this.prisma.produit.findUniqueOrThrow({ where: { id_product: produitId } });
    if (p.status !== 'IN_REVIEW') throw new BadRequestException("Ce produit n'est pas en attente de validation.");
    if (!review.checks.inciFilled) throw new BadRequestException('La liste INCI est vide : demandez des corrections.');
    if (review.checks.excludedFound.length) {
      throw new BadRequestException(`Ingrédient exclu par la Charte : ${review.checks.excludedFound.join(', ')}.`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.produit.update({ where: { id_product: produitId }, data: { status: 'ONLINE', updated_at: new Date() } });
      await this.resolveProductRequest(tx, p.id_marque, produitId, 'APPROVED', null);
      await this.audit(tx, adminId, 'PRODUCT_APPROVED', 'produit', produitId, { nom: p.nom });
    });
    // TODO(api-ai): réindexer le produit dans Qdrant maintenant qu'il est en ligne.
  }

  async rejectProduct(adminId: string, produitId: string, message: string): Promise<void> {
    const p = await this.prisma.produit.findUnique({ where: { id_product: produitId } });
    if (!p) throw new NotFoundException('Produit introuvable.');
    if (p.status !== 'IN_REVIEW') throw new BadRequestException("Ce produit n'est pas en attente de validation.");
    await this.prisma.$transaction(async (tx) => {
      await tx.produit.update({ where: { id_product: produitId }, data: { status: 'REJECTED', updated_at: new Date() } });
      await this.resolveProductRequest(tx, p.id_marque, produitId, 'REJECTED', message.trim());
      await this.audit(tx, adminId, 'PRODUCT_CHANGES_REQUESTED', 'produit', produitId, { message });
    });
  }

  private async resolveProductRequest(
    tx: Prisma.TransactionClient,
    marqueId: string,
    produitId: string,
    status: 'APPROVED' | 'REJECTED',
    message: string | null,
  ) {
    const pending = await tx.validation_request.findFirst({
      where: { id_produit: produitId, kind: 'PRODUCT', status: 'PENDING' },
      orderBy: { created_at: 'desc' },
    });
    const data = { status, rejection_message: message, resolved_at: new Date() };
    if (pending) await tx.validation_request.update({ where: { id_validation: pending.id_validation }, data });
    else await tx.validation_request.create({ data: { id_marque: marqueId, id_produit: produitId, kind: 'PRODUCT', ...data } });
  }

  /** Nouvelle marque acceptée : on crée sa marque et on y rattache le compte. */
  async approveBrandRequest(adminId: string, demandeId: string): Promise<{ marqueId: string }> {
    const demande = await this.prisma.demande_partenaire.findUnique({ where: { id_demande: demandeId } });
    if (!demande) throw new NotFoundException('Demande introuvable.');
    if (demande.status !== 'PENDING') throw new BadRequestException('Cette demande a déjà été traitée.');
    if (!WITHYOU_CHECK_KEYS.every((k) => demande.checks.includes(k))) {
      throw new BadRequestException('Cochez tous les points de la checklist avant d’accepter la marque.');
    }

    return this.prisma.$transaction(async (tx) => {
      const marqueId = randomUUID();
      const now = new Date();
      await tx.marque.create({
        data: {
          id_marque: marqueId,
          nom_marque: demande.nom_marque,
          slug: await uniqueBrandSlug(tx, demande.nom_marque),
          date_creation: now,
          adresse: '',
          engagement: [],
          besoin: [],
          wilaya_marque: '',
          histoire_marque: '',
          // Le nom saisi à l'inscription sert de point de départ au brouillon.
          draft: { name: demande.nom_marque } as Prisma.InputJsonValue,
        },
      });
      await tx.identity_marque.create({ data: { id_identity: randomUUID(), id_marque: marqueId } });
      await tx.partenaire_contact.create({
        data: {
          id_partenaire: randomUUID(),
          id_usr: demande.id_usr,
          id_marque: marqueId,
          role_partenaire: 'OWNER',
          titre_poste: 'Responsable de la marque',
          prenom: demande.prenom,
          nom: demande.nom,
          telephone: demande.telephone,
          created_at: now,
          updated_at: now,
        },
      });
      await tx.user.update({ where: { id_usr: demande.id_usr }, data: { role: 'PARTNER' } });
      await tx.demande_partenaire.update({ where: { id_demande: demandeId }, data: { status: 'APPROVED', resolved_at: now } });
      await tx.validation_request.create({ data: { id_marque: marqueId, kind: 'BRAND', status: 'APPROVED', resolved_at: now } });
      await this.audit(tx, adminId, 'BRAND_APPROVED', 'demande_partenaire', demandeId, { marqueId, name: demande.nom_marque });
      return { marqueId };
    });
  }

  /** Checklist de validation d'une nouvelle marque : enregistrée au fil des vérifications, visible par la marque. */
  async setBrandChecks(adminId: string, demandeId: string, checks: string[]): Promise<void> {
    const demande = await this.prisma.demande_partenaire.findUnique({ where: { id_demande: demandeId } });
    if (!demande) throw new NotFoundException('Demande introuvable.');
    if (demande.status !== 'PENDING') throw new BadRequestException('Cette demande a déjà été traitée.');
    const clean = WITHYOU_CHECK_KEYS.filter((k) => checks.includes(k));
    await this.prisma.$transaction(async (tx) => {
      await tx.demande_partenaire.update({ where: { id_demande: demandeId }, data: { checks: clean } });
      await this.audit(tx, adminId, 'BRAND_CHECKS_UPDATED', 'demande_partenaire', demandeId, { name: demande.nom_marque, checks: clean });
    });
  }

  async rejectBrandRequest(adminId: string, demandeId: string, message: string): Promise<void> {
    const demande = await this.prisma.demande_partenaire.findUnique({ where: { id_demande: demandeId } });
    if (!demande) throw new NotFoundException('Demande introuvable.');
    if (demande.status !== 'PENDING') throw new BadRequestException('Cette demande a déjà été traitée.');
    await this.prisma.$transaction(async (tx) => {
      // La marque voit le message, corrige son dossier et peut le renvoyer.
      await tx.demande_partenaire.update({
        where: { id_demande: demandeId },
        data: { status: 'REJECTED', resolved_at: new Date(), message_refus: message },
      });
      await this.audit(tx, adminId, 'BRAND_REJECTED', 'demande_partenaire', demandeId, { message });
    });
  }

  /* -------------------------------- Marques -------------------------------- */

  async brands(): Promise<AdminBrandRow[]> {
    const marques = await this.prisma.marque.findMany({
      orderBy: { nom_marque: 'asc' },
      include: {
        produit: { select: { status: true } },
        identity_marque: { select: { logo_url: true } },
        charge_compte: { select: { id_admin: true, prenom: true, nom: true } },
        partenaire_contact: { take: 1, include: { user: { select: { email: true } } } },
      },
    });
    const ratings = await this.prisma.avis.groupBy({ by: ['id_marque'], _avg: { stars: true }, _count: true });
    const ratingOf = new Map(ratings.map((r) => [r.id_marque, r]));

    return marques.map((m) => {
      const r = ratingOf.get(m.id_marque);
      return {
        id: m.id_marque,
        name: (m.draft as { name?: string } | null)?.name?.trim() || m.nom_marque,
        slug: m.slug,
        type: m.type,
        city: m.wilaya_marque,
        status: m.compte_status,
        pageStatus: m.page_status,
        products: m.produit.length,
        onlineProducts: m.produit.filter((p) => p.status === 'ONLINE').length,
        commissionRate: Number(m.commission_rate),
        rating: r?._avg.stars ?? null,
        reviews: r?._count ?? 0,
        contact: m.partenaire_contact[0]?.user.email ?? null,
        suspendedReason: m.suspended_reason,
        logoUrl: brandLogo(m),
        accountManager: m.charge_compte
          ? { id: m.charge_compte.id_admin, name: `${m.charge_compte.prenom} ${m.charge_compte.nom}`.trim() }
          : null,
      };
    });
  }

  /* ------------------------- Produits d'une marque ------------------------- */

  async brandProducts(marqueId: string): Promise<AdminBrandProduct[]> {
    const marque = await this.prisma.marque.findUnique({ where: { id_marque: marqueId }, select: { id_marque: true } });
    if (!marque) throw new NotFoundException('Marque introuvable.');
    const produits = await this.prisma.produit.findMany({
      where: { id_marque: marqueId },
      orderBy: { nom: 'asc' },
      include: { categorie: { select: { nom: true } }, produit_image: { orderBy: { ordre: 'asc' }, take: 1 } },
    });
    const since = new Date(Date.now() - 30 * 86_400_000);
    const sales = await this.prisma.ligne_order.groupBy({
      by: ['id_product'],
      where: { id_product: { in: produits.map((p) => p.id_product) }, order: { created_at: { gte: since } } },
      _sum: { quantite: true },
    });
    const sold = new Map(sales.map((s) => [s.id_product, s._sum.quantite ?? 0]));
    return produits.map((p) => ({
      id: p.id_product,
      nom: p.nom,
      imageUrl: p.produit_image[0]?.url ?? null,
      categorie: p.categorie?.nom ?? null,
      prix: Number(p.prix),
      stock: p.stock,
      statut: p.status,
      commission: Number(p.comission_negocie),
      ventes30j: sold.get(p.id_product) ?? 0,
    }));
  }

  /** Commission négociée pour un produit : s'applique aux prochaines commandes. */
  async setProductCommission(adminId: string, produitId: string, commission: number): Promise<void> {
    const p = await this.prisma.produit.findUnique({ where: { id_product: produitId } });
    if (!p) throw new NotFoundException('Produit introuvable.');
    await this.prisma.$transaction(async (tx) => {
      await tx.produit.update({ where: { id_product: produitId }, data: { comission_negocie: commission } });
      await this.audit(tx, adminId, 'PRODUCT_COMMISSION_UPDATED', 'produit', produitId, {
        avant: Number(p.comission_negocie),
        apres: commission,
      });
    });
  }

  /* ----------------------- Informations fiscales ------------------------ */

  async brandLegal(marqueId: string): Promise<AdminBrandLegal> {
    const marque = await this.prisma.marque.findUnique({ where: { id_marque: marqueId }, select: { id_marque: true } });
    if (!marque) throw new NotFoundException('Marque introuvable.');
    const l = await this.prisma.marque_legal.findUnique({ where: { id_marque: marqueId } });
    const by = l?.updated_by ? await this.prisma.admin.findUnique({ where: { id_admin: l.updated_by } }) : null;
    return {
      nif: l?.nif ?? null,
      nis: l?.nis ?? null,
      rc: l?.rc ?? null,
      articleImposition: l?.article_imposition ?? null,
      rib: l?.rib ?? null,
      banque: l?.banque ?? null,
      updatedAt: l?.updated_at.toISOString() ?? null,
      updatedBy: by ? `${by.prenom} ${by.nom.charAt(0)}.` : null,
    };
  }

  async saveBrandLegal(adminId: string, marqueId: string, dto: BrandLegalDto): Promise<AdminBrandLegal> {
    const marque = await this.prisma.marque.findUnique({ where: { id_marque: marqueId }, select: { id_marque: true } });
    if (!marque) throw new NotFoundException('Marque introuvable.');
    const clean = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);
    const data = {
      nif: clean(dto.nif),
      nis: clean(dto.nis),
      rc: clean(dto.rc),
      article_imposition: clean(dto.articleImposition),
      rib: clean(dto.rib),
      banque: clean(dto.banque),
      updated_by: adminId,
    };
    await this.prisma.$transaction(async (tx) => {
      await tx.marque_legal.upsert({ where: { id_marque: marqueId }, update: data, create: { id_marque: marqueId, ...data } });
      // Données sensibles : l'historique garde seulement quels champs sont renseignés.
      const filled = Object.entries(data)
        .filter(([k, v]) => k !== 'updated_by' && v)
        .map(([k]) => k);
      await this.audit(tx, adminId, 'BRAND_LEGAL_UPDATED', 'marque', marqueId, { champsRenseignes: filled });
    });
    return this.brandLegal(marqueId);
  }

  async updateBrand(adminId: string, marqueId: string, dto: UpdateBrandDto): Promise<void> {
    const marque = await this.prisma.marque.findUnique({ where: { id_marque: marqueId } });
    if (!marque) throw new NotFoundException('Marque introuvable.');
    if (dto.status === 'SUSPENDED' && !dto.suspendedReason?.trim()) {
      throw new BadRequestException('Indiquez le motif de la suspension.');
    }
    if (dto.accountManagerId && !(await this.prisma.admin.findFirst({ where: { id_admin: dto.accountManagerId, actif: true } }))) {
      throw new BadRequestException("Ce collaborateur n'existe pas ou n'a plus accès à la console.");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.marque.update({
        where: { id_marque: marqueId },
        data: {
          ...(dto.commissionRate !== undefined ? { commission_rate: dto.commissionRate } : {}),
          ...(dto.accountManagerId !== undefined ? { id_charge_compte: dto.accountManagerId } : {}),
          ...(dto.status ? { compte_status: dto.status, suspended_reason: dto.status === 'SUSPENDED' ? dto.suspendedReason!.trim() : null } : {}),
        },
      });
      if (dto.applyToProducts && dto.commissionRate !== undefined) {
        await tx.produit.updateMany({ where: { id_marque: marqueId }, data: { comission_negocie: dto.commissionRate } });
      }
      await this.audit(tx, adminId, 'BRAND_UPDATED', 'marque', marqueId, dto);
    });
  }
}
