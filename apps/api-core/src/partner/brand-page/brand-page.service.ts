import { BadRequestException, Injectable } from '@nestjs/common';
import { checkBrandContrast, isVideoUrl } from '@withyou/shared-utils';
import type { BrandPageCandidates, BrandPageContent, BrandPageState, PageStatus, TitleFont } from '@withyou/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { marqueWithBrandContent, toPublishedBrandContent } from '../../marques/brand-content.mapper';
import { loadBrandCandidates } from '../../marques/brand-extras';
import { UpdateBrandDraftDto } from '../dto/update-brand-draft.dto';

@Injectable()
export class BrandPageService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(marqueId: string): Promise<BrandPageState> {
    const marque = await this.prisma.marque.findUniqueOrThrow({
      where: { id_marque: marqueId },
      ...marqueWithBrandContent,
    });

    const published = toPublishedBrandContent(marque);
    // Drafts saved before a field existed (e.g. cardColor) inherit it from the published page.
    const draft: BrandPageContent = { ...published, ...((marque.draft as unknown as Partial<BrandPageContent> | null) ?? {}) };

    // Corrections demandées par withyou : affichées tant que la page n'est pas resoumise.
    const lastReview =
      marque.page_status === 'DRAFT'
        ? await this.prisma.validation_request.findFirst({
            where: { id_marque: marqueId, kind: 'PAGE', status: { not: 'PENDING' } },
            orderBy: { resolved_at: 'desc' },
          })
        : null;

    return {
      marqueId: marque.id_marque,
      slug: marque.slug,
      pageStatus: marque.page_status as PageStatus,
      published,
      draft,
      lastRejection:
        lastReview?.status === 'REJECTED' && lastReview.rejection_message
          ? { message: lastReview.rejection_message, at: (lastReview.resolved_at ?? lastReview.created_at).toISOString() }
          : null,
    };
  }

  /** Produits en ligne et avis disponibles : l'aperçu y applique le brouillon en direct. */
  getCandidates(marqueId: string): Promise<BrandPageCandidates> {
    return loadBrandCandidates(this.prisma, marqueId);
  }

  async updateDraft(marqueId: string, dto: UpdateBrandDraftDto): Promise<BrandPageState> {
    const state = await this.getState(marqueId);

    const merged: BrandPageContent = {
      ...state.draft,
      ...dto,
      titleFont: (dto.titleFont as TitleFont | undefined) ?? state.draft.titleFont,
      founders: dto.founders ?? state.draft.founders,
      commitments: dto.commitments ?? state.draft.commitments,
      needs: dto.needs?.map((n) => ({ label: n.label, imageUrl: n.imageUrl ?? null })) ?? state.draft.needs,
    };

    // Once a page has gone live, unsubmitted edits should read as "modifications
    // non soumises" rather than silently reverting to DRAFT — only bump DRAFT<->IN_REVIEW
    // transitions, never touch LIVE here (publishing is a separate, admin-only step).
    await this.prisma.marque.update({
      where: { id_marque: marqueId },
      data: { draft: merged as unknown as Prisma.InputJsonValue },
    });

    return { ...state, draft: merged };
  }

  async submit(marqueId: string): Promise<BrandPageState> {
    const state = await this.getState(marqueId);
    const { draft } = state;

    if (!draft.name?.trim()) {
      throw new BadRequestException('Ajoutez le nom de la marque avant de soumettre.');
    }

    if (isVideoUrl(draft.coverUrl) && !draft.coverImageUrl) {
      throw new BadRequestException(
        "Ajoutez une image de couverture : elle s'affiche si la vidéo ne peut pas se charger (mauvaise connexion) et dans « Marques du jour ».",
      );
    }

    const contrast = checkBrandContrast(draft.textColor, draft.bgColor, draft.accentColor, draft.cardColor);
    if (!contrast.ok) {
      throw new BadRequestException(
        `Contraste insuffisant : texte ${contrast.textRatio.toFixed(1)}:1 (minimum 4,5), titres ${contrast.accentRatio.toFixed(1)}:1 (minimum 3). Corrigez les couleurs avant de soumettre.`,
      );
    }

    // La demande de validation date la soumission et apparaît dans la console admin.
    await this.prisma.$transaction([
      this.prisma.marque.update({ where: { id_marque: marqueId }, data: { page_status: 'IN_REVIEW' } }),
      this.prisma.validation_request.deleteMany({ where: { id_marque: marqueId, kind: 'PAGE', status: 'PENDING' } }),
      this.prisma.validation_request.create({ data: { id_marque: marqueId, kind: 'PAGE' } }),
    ]);

    return { ...state, pageStatus: 'IN_REVIEW', lastRejection: null };
  }
}
