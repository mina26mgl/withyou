import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Produit tel qu'il était proposé (nom, prix… peuvent changer ensuite côté marque). */
@Schema({ _id: false })
export class RoutineProduit {
  @Prop({ required: true })
  produit_id: string;

  @Prop({ required: true })
  nom: string;

  @Prop({ required: true })
  marque_nom: string;

  @Prop({ required: true })
  marque_slug: string;

  @Prop({ type: String, default: null })
  marque_logo_url: string | null;

  @Prop({ type: String, default: null })
  image_url: string | null;

  @Prop({ required: true })
  prix: number;

  @Prop({ type: Number, default: null })
  fit_score: number | null;

  @Prop({ required: true })
  ordre: number;
}
const RoutineProduitSchema = SchemaFactory.createForClass(RoutineProduit);

/** Réponses du quiz qui ont servi à composer la routine. */
@Schema({ _id: false })
export class RoutineProfil {
  @Prop({ type: [String], default: [] })
  type_peau: string[];

  @Prop({ type: [String], default: [] })
  preoccupations: string[];

  @Prop({ type: [String], default: [] })
  routine_actuelle: string[];

  @Prop({ type: Number, default: null })
  sensibilite: number | null;
}
const RoutineProfilSchema = SchemaFactory.createForClass(RoutineProfil);

export type RoutineStatut = 'ACTIVE' | 'ARCHIVEE';

/**
 * Routine proposée à une cliente (collection `routines`). Une seule ACTIVE par
 * cliente : refaire le quiz archive la précédente, l'historique reste.
 */
@Schema({ collection: 'routines', timestamps: true })
export class Routine {
  /** consomateur.id_consumer (PostgreSQL). */
  @Prop({ required: true, index: true })
  consumer_id: string;

  @Prop({ required: true, enum: ['ACTIVE', 'ARCHIVEE'], default: 'ACTIVE' })
  statut: RoutineStatut;

  @Prop({ type: RoutineProfilSchema, required: true })
  profil: RoutineProfil;

  @Prop({ required: true })
  resume: string;

  @Prop({ type: [RoutineProduitSchema], default: [] })
  matin: RoutineProduit[];

  @Prop({ type: [RoutineProduitSchema], default: [] })
  soir: RoutineProduit[];

  createdAt: Date;
  updatedAt: Date;
}

export type RoutineDocument = HydratedDocument<Routine>;
export const RoutineSchema = SchemaFactory.createForClass(Routine);
