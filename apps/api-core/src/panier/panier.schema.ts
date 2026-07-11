import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class PanierLigne {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  produitId: string;

  @Prop({ required: true, min: 1 })
  quantite: number;

  @Prop({ required: true })
  prixUnitaire: number;
}

export type PanierLigneDocument = HydratedDocument<PanierLigne>;
export const PanierLigneSchema = SchemaFactory.createForClass(PanierLigne);
