import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BrandDocumentType, BrandRequestState } from '@withyou/shared-types';
import { formatDzPhone } from '@withyou/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_BRAND_DOCUMENTS, buildBrandChecklist, canSubmitDossier } from './brand-checklist';

/**
 * Dossier d'inscription d'une marque, avant la validation par withyou : la
 * marque dépose ses documents, envoie le dossier et suit la checklist.
 */
@Injectable()
export class BrandRequestService {
  constructor(private readonly prisma: PrismaService) {}

  private async demandeOf(idUsr: string) {
    const demande = await this.prisma.demande_partenaire.findUnique({
      where: { id_usr: idUsr },
      include: { documents: { orderBy: { created_at: 'asc' } } },
    });
    if (!demande) throw new NotFoundException("Aucune demande de marque n'est associée à ce compte.");
    return demande;
  }

  async state(idUsr: string): Promise<BrandRequestState> {
    const d = await this.demandeOf(idUsr);
    const types = d.documents.map((doc) => doc.type);
    return {
      id: d.id_demande,
      nomMarque: d.nom_marque,
      status: d.status,
      submittedAt: d.submitted_at?.toISOString() ?? null,
      rejectionMessage: d.status === 'REJECTED' ? d.message_refus : null,
      documents: d.documents.map((doc) => ({
        id: doc.id_document,
        type: doc.type as BrandDocumentType,
        nom: doc.nom,
        url: doc.url,
        taille: doc.taille,
        createdAt: doc.created_at.toISOString(),
      })),
      checklist: buildBrandChecklist({
        documentTypes: types,
        submitted: !!d.submitted_at && d.status === 'PENDING',
        checks: d.checks,
        telephone: d.telephone ? formatDzPhone(d.telephone) : null,
      }),
      canSubmit: canSubmitDossier(types),
    };
  }

  /** Dossier modifiable tant qu'il n'est pas en cours d'examen ni accepté. */
  private assertEditable(d: { status: string; submitted_at: Date | null }) {
    if (d.status === 'APPROVED') throw new ForbiddenException('Votre marque est déjà acceptée.');
    if (d.status === 'PENDING' && d.submitted_at) {
      throw new ForbiddenException("Votre dossier est en cours d'examen : il ne peut plus être modifié.");
    }
  }

  async addDocument(idUsr: string, doc: { type: BrandDocumentType; nom: string; url: string; taille: number }) {
    const d = await this.demandeOf(idUsr);
    this.assertEditable(d);
    if (d.documents.length >= MAX_BRAND_DOCUMENTS) throw new BadRequestException(`${MAX_BRAND_DOCUMENTS} documents au maximum.`);
    await this.prisma.demande_document.create({
      data: { id_demande: d.id_demande, type: doc.type, nom: doc.nom.slice(0, 160) || 'Document', url: doc.url, taille: doc.taille },
    });
    return this.state(idUsr);
  }

  async removeDocument(idUsr: string, documentId: string) {
    const d = await this.demandeOf(idUsr);
    this.assertEditable(d);
    const res = await this.prisma.demande_document.deleteMany({ where: { id_document: documentId, id_demande: d.id_demande } });
    if (!res.count) throw new NotFoundException('Document introuvable.');
    return this.state(idUsr);
  }

  /** Envoie (ou renvoie après un refus) le dossier : il apparaît alors dans la console admin. */
  async submit(idUsr: string) {
    const d = await this.demandeOf(idUsr);
    this.assertEditable(d);
    if (!canSubmitDossier(d.documents.map((doc) => doc.type))) {
      throw new BadRequestException("Ajoutez votre registre du commerce (ou carte d'artisan) et votre catalogue avant d'envoyer le dossier.");
    }
    await this.prisma.demande_partenaire.update({
      where: { id_demande: d.id_demande },
      // Nouvel envoi : les documents ont pu changer, withyou les revérifie.
      data: { status: 'PENDING', submitted_at: new Date(), resolved_at: null, checks: d.checks.filter((c) => c !== 'DOCUMENTS') },
    });
    return this.state(idUsr);
  }
}
