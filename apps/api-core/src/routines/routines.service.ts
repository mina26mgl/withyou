import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ConsumerRoutine, PublicProduct, RoutineItem } from '@withyou/shared-types';
import { buildRoutine, fitScore, routineSummary, type RoutineAnswers } from '@withyou/shared-utils';
import { ProduitsService } from '../produits/produits.service';
import { Routine, RoutineDocument, RoutineProduit } from './routine.schema';

/** Profil cliente (PostgreSQL) : ce qu'il faut pour composer une routine. */
export interface RoutineConsumer extends RoutineAnswers {
  id_consumer: string;
  routine_actuelle?: string[] | null;
}

@Injectable()
export class RoutinesService {
  private readonly logger = new Logger(RoutinesService.name);

  constructor(
    @InjectModel(Routine.name) private readonly routineModel: Model<RoutineDocument>,
    private readonly produits: ProduitsService,
  ) {}

  /**
   * Compose la routine d'après les réponses au quiz et les produits en ligne,
   * l'enregistre comme routine ACTIVE et archive la précédente.
   */
  async generate(consumer: RoutineConsumer): Promise<ConsumerRoutine> {
    const catalogue = await this.produits.findPublic();
    const { morning, evening } = buildRoutine(catalogue, consumer);
    const toItem = (p: PublicProduct, ordre: number): RoutineProduit => ({
      produit_id: p.id,
      nom: p.nom,
      marque_nom: p.marque.nom,
      marque_slug: p.marque.slug,
      marque_logo_url: p.marque.logoUrl,
      image_url: p.imagesUrls[0] ?? null,
      prix: p.prix,
      fit_score: fitScore(p, consumer),
      ordre,
    });

    await this.routineModel
      .updateMany({ consumer_id: consumer.id_consumer, statut: 'ACTIVE' }, { statut: 'ARCHIVEE' })
      .exec();
    const routine = await this.routineModel.create({
      consumer_id: consumer.id_consumer,
      statut: 'ACTIVE',
      profil: {
        type_peau: consumer.type_peau ?? [],
        preoccupations: consumer.preoccupations ?? [],
        routine_actuelle: consumer.routine_actuelle ?? [],
        sensibilite: consumer.sensibilite ?? null,
      },
      resume: routineSummary(consumer),
      matin: morning.map(toItem),
      soir: evening.map(toItem),
    });
    this.logger.log(
      `Routine proposée: consumer=${consumer.id_consumer}, ${routine.matin.length} matin / ${routine.soir.length} soir`,
    );
    return this.toPublic(routine, null);
  }

  /**
   * Routine ACTIVE de la cliente. Un produit passé hors ligne depuis n'est plus
   * affiché (il reste dans le document, pour l'historique).
   */
  async findActive(consumerId: string): Promise<ConsumerRoutine | null> {
    const routine = await this.routineModel.findOne({ consumer_id: consumerId, statut: 'ACTIVE' }).sort({ createdAt: -1 }).exec();
    if (!routine) return null;
    const online = new Set((await this.produits.findPublic()).map((p) => p.id));
    return this.toPublic(routine, online);
  }

  private toPublic(routine: RoutineDocument, online: Set<string> | null): ConsumerRoutine {
    const items = (list: RoutineProduit[]): RoutineItem[] =>
      [...list]
        .sort((a, b) => a.ordre - b.ordre)
        .filter((p) => !online || online.has(p.produit_id))
        .map((p) => ({
          produitId: p.produit_id,
          nom: p.nom,
          marque: { nom: p.marque_nom, slug: p.marque_slug, logoUrl: p.marque_logo_url },
          imageUrl: p.image_url,
          prix: p.prix,
          fitScore: p.fit_score,
        }));
    return {
      id: routine.id,
      resume: routine.resume,
      matin: items(routine.matin),
      soir: items(routine.soir),
      createdAt: routine.createdAt.toISOString(),
    };
  }
}
