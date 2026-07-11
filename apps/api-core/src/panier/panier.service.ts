import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PanierLigne, PanierLigneDocument } from './panier.schema';

@Injectable()
export class PanierService {
  constructor(@InjectModel(PanierLigne.name) private readonly panierModel: Model<PanierLigneDocument>) {}

  findByUserId(userId: string) {
    return this.panierModel.find({ userId }).exec();
  }

  async addLigne(userId: string, produitId: string, quantite: number, prixUnitaire: number) {
    const existing = await this.panierModel.findOne({ userId, produitId }).exec();
    if (existing) {
      existing.quantite += quantite;
      return existing.save();
    }
    return this.panierModel.create({ userId, produitId, quantite, prixUnitaire });
  }

  removeLigne(userId: string, produitId: string) {
    return this.panierModel.deleteOne({ userId, produitId }).exec();
  }

  clear(userId: string) {
    return this.panierModel.deleteMany({ userId }).exec();
  }
}
